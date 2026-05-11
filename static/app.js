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
    const sliderEl = document.getElementById('tolerance-slider');
    const sliderValEl = document.getElementById('tolerance-val');
    const sliderHelpEl = document.getElementById('tolerance-help');
    const searchBtn = document.getElementById('search-btn');
    const applianceGroup = document.getElementById('appliance-group');
    const customApplianceInput = document.getElementById('custom-appliance-input');
    const addApplianceBtn = document.getElementById('add-appliance-btn');
    const applianceStatus = document.getElementById('appliance-status');

    const resultsSection = document.getElementById('results-section');
    const errorMsg = document.getElementById('error-message');
    const gridEl = document.getElementById('recipes-grid');
    const fallbackContainer = document.getElementById('fallback-container');
    const fallbackTitle = document.getElementById('fallback-title');
    const fallbackSuggestions = document.getElementById('fallback-suggestions');

    // --- Events ---
    sliderEl.addEventListener('input', (e) => {
        const val = e.target.value;
        sliderValEl.textContent = val;
        sliderHelpEl.textContent = sliderTexts[val];
    });

    addBtn.addEventListener('click', addIngredient);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addIngredient();
    });

    searchBtn.addEventListener('click', fetchRecommendations);

    addApplianceBtn.addEventListener('click', addCustomAppliance);
    customApplianceInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addCustomAppliance();
    });

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
                removeIngredient(parseInt(e.target.dataset.index));
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
            <span class="toggle-content"><i class="fa-solid fa-kitchen-set"></i> ${value}</span>
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
        applianceStatus.textContent = `正在請 AI 為「${val}」生成菜譜… (約需 10 秒)`;

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

            if (data.skipped) {
                applianceStatus.textContent = data.message || `已加入「${val}」。`;
            } else if (data.added > 0) {
                applianceStatus.textContent = `已為「${val}」收錄 ${data.added} 道菜譜到資料庫，按下「來抽今晚的菜單」即可看到推薦。`;
            } else {
                applianceStatus.textContent = `已加入「${val}」，但未產生任何菜譜。`;
            }
        } catch (err) {
            console.error(err);
            applianceStatus.textContent = '系統發生錯誤，請稍後再試。';
        } finally {
            addApplianceBtn.disabled = false;
        }
    }

    async function fetchRecommendations() {
        // Gathering checked appliances
        const checkboxes = document.querySelectorAll('input[name="appliance"]:checked');
        const appliances = Array.from(checkboxes).map(cb => cb.value);
        const tolerance = parseInt(sliderEl.value, 10);

        // Hide old results
        resultsSection.classList.remove('hidden');
        errorMsg.classList.add('hidden');
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
                    ingredients: ingredients,
                    appliances: appliances,
                    missing_tolerance: tolerance
                })
            });

            const data = await response.json();
            gridEl.innerHTML = '';

            if (data.error) {
                errorMsg.textContent = data.error;
                errorMsg.classList.remove('hidden');
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
                
                card.innerHTML = `
                    <div class="recipe-img-placeholder"><i class="fa-solid fa-utensils"></i></div>
                    <div class="recipe-content">
                        <span class="status-tag ${r.tag_class}">${r.tag_text}</span>
                        <h3 class="recipe-title">${r.name}</h3>
                        <div class="recipe-meta">
                            <span><i class="fa-regular fa-clock"></i> ${r.cook_time ? r.cook_time + ' 分鐘' : '-'}</span>
                            <span><i class="fa-solid fa-kitchen-set"></i> ${r.required_appliances.filter(a => a).length > 0 ? r.required_appliances.join(', ') : '無需求'}</span>
                        </div>
                    </div>
                `;
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
