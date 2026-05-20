document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let ingredients = [];
    const sliderTexts = {
        0: "0 樣：只看現在就能做的",
        1: "1 樣：願意補買 1 樣",
        2: "2 樣：可接受少數彈性",
        3: "3 樣以上：可接受較多彈性"
    };

    // --- DOM Elements ---
    const inputEl = document.getElementById('ingredient-input');
    const addBtn = document.getElementById('add-ingredient-btn');
    const tagsContainer = document.getElementById('ingredient-tags');
    const toleranceGroup = document.getElementById('tolerance-group');
    const sliderValEl = document.getElementById('tolerance-val');
    const sliderHelpEl = document.getElementById('tolerance-help');
    const searchBtn = document.getElementById('search-btn');
    const applianceGroup = document.getElementById('appliance-group');
    const customApplianceInput = document.getElementById('custom-appliance-input');
    const addApplianceBtn = document.getElementById('add-appliance-btn');
    const applianceStatus = document.getElementById('appliance-status');

    const resultsSection = document.getElementById('results-section');
    const errorMsg = document.getElementById('error-message');
    const invalidNotice = document.getElementById('invalid-notice');
    const gridEl = document.getElementById('recipes-grid');
    const fallbackContainer = document.getElementById('fallback-container');
    const fallbackTitle = document.getElementById('fallback-title');
    const fallbackSuggestions = document.getElementById('fallback-suggestions');

    // Modal elements
    const modalOverlay = document.getElementById('recipe-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalName = document.getElementById('modal-recipe-name');
    const modalMeta = document.getElementById('modal-recipe-meta');
    const modalIngredients = document.getElementById('modal-ingredients');
    const modalSteps = document.getElementById('modal-steps');
    const modalImageCredit = document.getElementById('modal-image-credit');

    // --- Events ---
    toleranceGroup.addEventListener('change', (e) => {
        if (e.target.name !== 'tolerance') return;
        const val = e.target.value;
        sliderValEl.textContent = val;
        sliderHelpEl.textContent = sliderTexts[val];
    });

    function getTolerance() {
        const checked = toleranceGroup.querySelector('input[name="tolerance"]:checked');
        return checked ? parseInt(checked.value, 10) : 1;
    }

    addBtn.addEventListener('click', addIngredient);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addIngredient();
    });

    searchBtn.addEventListener('click', fetchRecommendations);

    addApplianceBtn.addEventListener('click', addCustomAppliance);
    customApplianceInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addCustomAppliance();
    });

    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal();
    });

    // --- Modal ---
    function openModal(recipe) {
        modalName.textContent = recipe.name;
        modalMeta.innerHTML = `
            <span><i class="fa-regular fa-clock"></i> ${recipe.cook_time ? recipe.cook_time + ' 分鐘' : '—'}</span>
            <span><i class="fa-solid fa-kitchen-set"></i> ${recipe.required_appliances.join(', ') || '無需求'}</span>
        `;
        modalIngredients.innerHTML = (recipe.ingredients || [])
            .map(ing => `<li>${ing}</li>`).join('');
        modalSteps.innerHTML = (recipe.steps || [])
            .map((step, i) => `<li><span class="step-num">${String(i + 1).padStart(2, '0')}</span>${step}</li>`).join('');

        const credit = recipe.image_credit;
        if (credit && credit.photographer) {
            const photographer = credit.photographer_url
                ? `<a href="${credit.photographer_url}?utm_source=what_to_cook&utm_medium=referral" target="_blank" rel="noopener">${credit.photographer}</a>`
                : credit.photographer;
            modalImageCredit.innerHTML =
                `Photo by ${photographer} on <a href="https://unsplash.com/?utm_source=what_to_cook&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>`;
        } else {
            modalImageCredit.innerHTML = '';
        }

        modalOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // --- Functions ---
    function addIngredient() {
        const val = inputEl.value.trim();
        if (val && !ingredients.includes(val)) {
            ingredients.push(val);
            renderTags();
        }
        inputEl.value = '';
    }

    function removeIngredient(index) {
        ingredients.splice(index, 1);
        renderTags();
    }

    function renderTags() {
        tagsContainer.innerHTML = '';
        ingredients.forEach((ing, i) => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `
                <i class="fa-solid fa-leaf"></i> ${ing}
                <span class="tag-remove" data-index="${i}"><i class="fa-solid fa-xmark"></i></span>
            `;
            tagsContainer.appendChild(tag);
        });

        document.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                removeIngredient(parseInt(e.currentTarget.dataset.index));
            });
        });
    }

    function applianceExists(value) {
        return Array.from(document.querySelectorAll('input[name="appliance"]'))
            .some(cb => cb.value === value);
    }

    function addApplianceToggle(value, checked = true) {
        const label = document.createElement('label');
        label.className = 'toggle-btn';
        label.innerHTML = `
            <input type="checkbox" name="appliance" value="${value}" ${checked ? 'checked' : ''}>
            <span class="toggle-content">${value}</span>
        `;
        applianceGroup.appendChild(label);
    }

    async function addCustomAppliance() {
        const val = (customApplianceInput.value || '').trim();
        if (!val) return;

        if (applianceExists(val)) {
            applianceStatus.textContent = `「${val}」已存在於清單中。`;
            customApplianceInput.value = '';
            return;
        }

        addApplianceBtn.disabled = true;
        applianceStatus.textContent = `正在加入「${val}」…`;

        try {
            const response = await fetch('/appliance/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appliance: val })
            });
            const data = await response.json();

            if (data.error) {
                applianceStatus.textContent = `失敗：${data.error}`;
                return;
            }

            addApplianceToggle(val, true);
            customApplianceInput.value = '';
            applianceStatus.textContent = `已加入「${val}」。`;
        } catch (err) {
            console.error(err);
            applianceStatus.textContent = '系統發生錯誤，請稍後再試。';
        } finally {
            addApplianceBtn.disabled = false;
        }
    }

    function renderInvalidNotice(data) {
        const invalidIng = Array.isArray(data.invalid_ingredients) ? data.invalid_ingredients : [];
        const invalidApp = Array.isArray(data.invalid_appliances) ? data.invalid_appliances : [];
        if (!invalidIng.length && !invalidApp.length) return;

        const items = [];
        if (invalidIng.length) items.push(`食材：${invalidIng.join('、')}`);
        if (invalidApp.length) items.push(`廚具：${invalidApp.join('、')}`);

        const hint = data.expansion_skipped
            ? '食材或廚具不存在。請修正後再試一次。'
            : '食材或廚具不存在。請修正後再試一次。';

        invalidNotice.innerHTML =
            `<div class="invalid-icon"><i class="fa-solid fa-circle-exclamation"></i></div>` +
            `<strong>偵測到無法辨識的輸入</strong>` +
            `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>` +
            `<span class="invalid-hint">${hint}</span>`;
        invalidNotice.classList.remove('hidden');
    }

    async function fetchRecommendations() {
        // Auto-commit any pending text in the ingredient input so the user
        // doesn't have to remember to press Enter/加入 before clicking search.
        if (inputEl.value.trim()) {
            addIngredient();
        }

        // Re-read every input fresh on each click so a second抽 picks up any
        // changes the user made since the first — no page refresh required.
        const currentIngredients = ingredients.slice();
        const appliances = Array.from(
            document.querySelectorAll('input[name="appliance"]:checked')
        ).map(cb => cb.value);
        const tolerance = getTolerance();

        // Hide old results
        resultsSection.classList.remove('hidden');
        errorMsg.classList.add('hidden');
        invalidNotice.classList.add('hidden');
        fallbackContainer.classList.add('hidden');
        gridEl.innerHTML = `
            <div class="loading-wrapper">
                <div class="spinner"><i class="fa-solid fa-fan"></i></div>
                <p style="color:var(--text-muted)">正在幫你翻找冰箱與食譜...</p>
            </div>`;

        try {
            const response = await fetch('/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ingredients: currentIngredients,
                    appliances: appliances,
                    missing_tolerance: tolerance
                })
            });

            const data = await response.json();
            gridEl.innerHTML = '';

            renderInvalidNotice(data);

            if (data.error) {
                if (data.error === '請至少輸入一項食材') {
                    fallbackTitle.textContent = data.error;
                    fallbackSuggestions.innerHTML = [
                        '在上方輸入框打上你手邊的食材，按 Enter 加入籃子',
                        '例如：雞蛋、高麗菜、雞胸肉',
                        '加入後再按「來抽今晚的菜單！」'
                    ].map(s => `<li>${s}</li>`).join('');
                    fallbackContainer.classList.remove('hidden');
                } else {
                    errorMsg.textContent = data.error;
                    errorMsg.classList.remove('hidden');
                }
                return;
            }

            if (data.fallback) {
                fallbackTitle.textContent = data.fallback.message;
                fallbackSuggestions.innerHTML = data.fallback.suggestions.map(s => `<li>${s}</li>`).join('');
                fallbackContainer.classList.remove('hidden');
                return;
            }

            // Render recipes
            data.recipes.forEach((r, i) => {
                const card = document.createElement('div');
                card.className = 'recipe-card';
                card.style.animationDelay = `${i * 0.1}s`;
                card.style.cursor = 'pointer';
                
                const placeholderHtml = `<div class="recipe-img-placeholder"><i class="fa-solid fa-utensils"></i></div>`;
                const imageHtml = r.image_url
                    ? `<img class="recipe-img" src="${r.image_url}" alt="${r.name}" loading="lazy">`
                    : placeholderHtml;

                card.innerHTML = `
                    ${imageHtml}
                    <div class="recipe-content">
                        <span class="status-tag ${r.tag_class}">${r.tag_text}</span>
                        <h3 class="recipe-title">${r.name}</h3>
                        <div class="recipe-meta">
                            <span><i class="fa-regular fa-clock"></i> ${r.cook_time ? r.cook_time + ' 分鐘' : '-'}</span>
                            <span><i class="fa-solid fa-kitchen-set"></i> ${r.required_appliances.filter(a => a).length > 0 ? r.required_appliances.join(', ') : '無需求'}</span>
                        </div>
                        <div class="card-hint"><i class="fa-solid fa-hand-pointer"></i> 點擊查看做法</div>
                    </div>
                `;

                const imgEl = card.querySelector('img.recipe-img');
                if (imgEl) {
                    imgEl.addEventListener('error', () => {
                        imgEl.outerHTML = placeholderHtml;
                    });
                }

                card.addEventListener('click', () => openModal(r));
                gridEl.appendChild(card);
            });

        } catch (err) {
            console.error(err);
            gridEl.innerHTML = '';
            errorMsg.textContent = '系統發生錯誤，請稍後再試。';
            errorMsg.classList.remove('hidden');
        }
    }
});
