document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let ingredients = [];
    let currentModalRecipe = null;
    const sliderTexts = {
        0: "0 樣：只看現在就能做的",
        1: "1 樣：願意補買 1 樣",
        2: "2 樣：可接受少數彈性",
        3: "3 樣以上：可接受較多彈性"
    };

    // --- Favorites (localStorage) ---
    const FAV_KEY = 'wsicfd:favorites';
    let favStorageOk = true;

    function loadFavorites() {
        try {
            const raw = localStorage.getItem(FAV_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            favStorageOk = false;
            return [];
        }
    }

    function saveFavorites(list) {
        try {
            localStorage.setItem(FAV_KEY, JSON.stringify(list));
            favStorageOk = true;
        } catch (e) {
            favStorageOk = false;
        }
    }

    function favKeyOf(recipe) {
        return recipe.recipe_id != null ? `id:${recipe.recipe_id}` : `name:${recipe.name}`;
    }

    function isFavorited(recipe) {
        const key = favKeyOf(recipe);
        return loadFavorites().some(f => f._key === key);
    }

    function toggleFavorite(recipe) {
        const list = loadFavorites();
        const key = favKeyOf(recipe);
        const idx = list.findIndex(f => f._key === key);
        if (idx >= 0) {
            list.splice(idx, 1);
        } else {
            // Strip recommendation-context fields; keep only the reusable recipe body.
            list.unshift({
                _key: key,
                _saved_at: new Date().toISOString(),
                recipe_id: recipe.recipe_id,
                name: recipe.name,
                cook_time: recipe.cook_time,
                steps: recipe.steps || [],
                ingredients: recipe.ingredients || [],
                required_appliances: recipe.required_appliances || [],
                image_url: recipe.image_url,
                image_credit: recipe.image_credit,
            });
        }
        saveFavorites(list);
        renderFavorites();
        document.dispatchEvent(new CustomEvent('favorites-changed', { detail: { key } }));
        return idx < 0;
    }

    function removeFavorite(key) {
        const list = loadFavorites().filter(f => f._key !== key);
        saveFavorites(list);
        renderFavorites();
    }

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
    const modalFavBtn = document.getElementById('modal-fav-btn');
    const modalDownloadBtn = document.getElementById('modal-download-btn');
    const modalPrintBtn = document.getElementById('modal-print-btn');

    // Favorites elements
    const favoritesSection = document.getElementById('favorites-section');
    const favoritesGrid = document.getElementById('favorites-grid');
    const favoritesCount = document.getElementById('favorites-count');
    const favoritesToggle = document.getElementById('favorites-toggle');

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

    modalFavBtn.addEventListener('click', () => {
        if (!currentModalRecipe) return;
        toggleFavorite(currentModalRecipe);
        updateModalFavButton(currentModalRecipe);
    });
    modalDownloadBtn.addEventListener('click', () => {
        if (currentModalRecipe) downloadRecipeMarkdown(currentModalRecipe);
    });
    modalPrintBtn.addEventListener('click', () => {
        if (currentModalRecipe) printRecipe(currentModalRecipe);
    });

    favoritesToggle.addEventListener('click', () => {
        const expanded = favoritesToggle.getAttribute('aria-expanded') === 'true';
        favoritesToggle.setAttribute('aria-expanded', String(!expanded));
        favoritesGrid.classList.toggle('collapsed', expanded);
        favoritesToggle.querySelector('i').className = expanded
            ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
        favoritesToggle.querySelector('span').textContent = expanded ? '展開' : '收合';
    });

    // --- Modal ---
    function openModal(recipe) {
        currentModalRecipe = recipe;
        modalName.textContent = recipe.name;
        const appliances = (recipe.required_appliances || []).filter(Boolean);
        modalMeta.innerHTML = `
            <span><i class="fa-regular fa-clock"></i> ${recipe.cook_time ? recipe.cook_time + ' 分鐘' : '—'}</span>
            <span><i class="fa-solid fa-kitchen-set"></i> ${appliances.join(', ') || '無需求'}</span>
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

        updateModalFavButton(recipe);
        modalOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
        document.body.style.overflow = '';
        currentModalRecipe = null;
    }

    function updateModalFavButton(recipe) {
        const fav = isFavorited(recipe);
        modalFavBtn.classList.toggle('active', fav);
        modalFavBtn.querySelector('i').className = fav
            ? 'fa-solid fa-star' : 'fa-regular fa-star';
        modalFavBtn.querySelector('span').textContent = fav ? '已收藏' : '收藏';
        if (!favStorageOk) {
            modalFavBtn.disabled = true;
            modalFavBtn.title = '此瀏覽器無法使用本機儲存（可能為隱私模式），但仍可下載。';
        }
    }

    // --- Favorites rendering ---
    function renderFavorites() {
        const list = loadFavorites();
        favoritesCount.textContent = list.length;
        if (!list.length) {
            favoritesSection.classList.add('hidden');
            favoritesGrid.innerHTML = '';
            return;
        }
        favoritesSection.classList.remove('hidden');
        favoritesGrid.innerHTML = '';
        list.forEach((r, i) => {
            const card = buildRecipeCard(r, i, { fromFavorites: true });
            favoritesGrid.appendChild(card);
        });
    }

    function buildRecipeCard(r, index, opts = {}) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.style.animationDelay = `${index * 0.08}s`;
        card.style.cursor = 'pointer';

        const placeholderHtml = `<div class="recipe-img-placeholder"><i class="fa-solid fa-utensils"></i></div>`;
        const imageHtml = r.image_url
            ? `<img class="recipe-img" src="${r.image_url}" alt="${escapeHtml(r.name)}" loading="lazy">`
            : placeholderHtml;

        const appliances = (r.required_appliances || []).filter(Boolean);
        const statusTag = r.tag_text
            ? `<span class="status-tag ${r.tag_class || ''}">${r.tag_text}</span>`
            : '';

        const favOn = isFavorited(r);
        const favBtnHtml = `
            <button class="card-fav-btn ${favOn ? 'active' : ''}" type="button" aria-label="${favOn ? '取消收藏' : '收藏'}" title="${favOn ? '取消收藏' : '收藏'}">
                <i class="${favOn ? 'fa-solid' : 'fa-regular'} fa-star"></i>
            </button>`;

        card.innerHTML = `
            <div class="recipe-img-wrap">
                ${imageHtml}
                ${favBtnHtml}
            </div>
            <div class="recipe-content">
                ${statusTag}
                <h3 class="recipe-title">${escapeHtml(r.name)}</h3>
                <div class="recipe-meta">
                    <span><i class="fa-regular fa-clock"></i> ${r.cook_time ? r.cook_time + ' 分鐘' : '-'}</span>
                    <span><i class="fa-solid fa-kitchen-set"></i> ${appliances.length ? appliances.join(', ') : '無需求'}</span>
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

        const favBtn = card.querySelector('.card-fav-btn');
        const refreshFavBtn = () => {
            const nowFav = isFavorited(r);
            favBtn.classList.toggle('active', nowFav);
            favBtn.querySelector('i').className = nowFav ? 'fa-solid fa-star' : 'fa-regular fa-star';
            favBtn.setAttribute('aria-label', nowFav ? '取消收藏' : '收藏');
            favBtn.title = nowFav ? '取消收藏' : '收藏';
        };
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(r);
            refreshFavBtn();
        });
        // Keep this card's star in sync when toggled elsewhere (e.g. modal).
        document.addEventListener('favorites-changed', (ev) => {
            if (ev.detail && ev.detail.key === favKeyOf(r)) refreshFavBtn();
        });

        card.addEventListener('click', () => openModal(r));
        return card;
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // --- Download / Print ---
    function recipeToMarkdown(r) {
        const lines = [];
        lines.push(`# ${r.name}`);
        lines.push('');
        const metaBits = [];
        if (r.cook_time) metaBits.push(`烹飪時間：${r.cook_time} 分鐘`);
        const appliances = (r.required_appliances || []).filter(Boolean);
        if (appliances.length) metaBits.push(`所需廚具：${appliances.join('、')}`);
        if (metaBits.length) {
            lines.push(metaBits.join('  \n'));
            lines.push('');
        }
        lines.push('## 食材');
        (r.ingredients || []).forEach(ing => lines.push(`- ${ing}`));
        lines.push('');
        lines.push('## 步驟');
        (r.steps || []).forEach((step, i) => lines.push(`${i + 1}. ${step}`));
        lines.push('');
        lines.push('---');
        lines.push(`由「今晚，煮點什麼？」匯出 · ${new Date().toLocaleString()}`);
        return lines.join('\n');
    }

    function safeFilename(name) {
        // Strip characters not allowed on Windows / common filesystems.
        return String(name).replace(/[\\/:*?"<>|\x00-\x1F]/g, '_').trim() || 'recipe';
    }

    function downloadRecipeMarkdown(r) {
        const md = recipeToMarkdown(r);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename(r.name)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function printRecipe(r) {
        const win = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
        if (!win) {
            // Popup blocked — fall back to printing the current modal.
            window.print();
            return;
        }
        const appliances = (r.required_appliances || []).filter(Boolean);
        const ingredientsHtml = (r.ingredients || [])
            .map(ing => `<li>${escapeHtml(ing)}</li>`).join('');
        const stepsHtml = (r.steps || [])
            .map((s, i) => `<li><strong>${i + 1}.</strong> ${escapeHtml(s)}</li>`).join('');
        win.document.write(`<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8"><title>${escapeHtml(r.name)}</title>
<style>
  body { font-family: 'Noto Serif TC', 'PingFang TC', serif; line-height: 1.8; color: #2a2622; max-width: 640px; margin: 2em auto; padding: 0 1.5em; }
  h1 { border-bottom: 2px solid #d97a3d; padding-bottom: .4em; }
  h2 { color: #8a4a1c; margin-top: 1.6em; }
  .meta { color: #6b6359; font-size: .95em; margin-bottom: 1.4em; }
  ul, ol { padding-left: 1.4em; }
  li { margin: .5em 0; }
  .footer { margin-top: 2.5em; font-size: .8em; color: #9a9081; border-top: 1px dashed #d9cfc1; padding-top: 1em; }
</style></head><body>
  <h1>${escapeHtml(r.name)}</h1>
  <div class="meta">
    ${r.cook_time ? `烹飪時間：${r.cook_time} 分鐘　` : ''}
    ${appliances.length ? `所需廚具：${escapeHtml(appliances.join('、'))}` : ''}
  </div>
  <h2>食材</h2>
  <ul>${ingredientsHtml}</ul>
  <h2>步驟</h2>
  <ol>${stepsHtml}</ol>
  <div class="footer">由「今晚，煮點什麼？」匯出 · ${new Date().toLocaleString()}</div>
  <script>window.onload = () => { window.print(); };</script>
</body></html>`);
        win.document.close();
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
                gridEl.appendChild(buildRecipeCard(r, i));
            });

        } catch (err) {
            console.error(err);
            gridEl.innerHTML = '';
            errorMsg.textContent = '系統發生錯誤，請稍後再試。';
            errorMsg.classList.remove('hidden');
        }
    }

    // --- Initial load ---
    renderFavorites();
});
