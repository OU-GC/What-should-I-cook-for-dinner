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

    // --- 常見食材清單 (autocomplete source) ---
    const COMMON_INGREDIENTS = [
        // 蛋奶豆腐
        '雞蛋', '皮蛋', '豆腐', '嫩豆腐', '板豆腐', '凍豆腐', '豆干', '豆皮', '油豆腐', '納豆', '牛奶', '起司', '奶油',
        // 肉類
        '雞胸肉', '雞腿肉', '雞翅', '雞腿', '豬絞肉', '豬五花', '豬排', '豬里肌', '豬肉', '牛絞肉', '牛肉', '牛腱',
        '羊肉', '培根', '火腿', '香腸', '臘腸', '豬血糕',
        // 海鮮
        '蝦', '蝦仁', '花枝', '透抽', '魷魚', '鮭魚', '鯛魚', '吳郭魚', '虱目魚', '秋刀魚', '鯖魚', '蛤蜊', '牡蠣',
        '文蛤', '螃蟹', '干貝', '魚板', '魚丸', '蟹肉棒',
        // 葉菜類
        '高麗菜', '白菜', '小白菜', '菠菜', '地瓜葉', '空心菜', '莧菜', '韭菜', '青江菜', '芥藍', '油菜',
        '花椰菜', '綠花椰菜', '白花椰菜', '萵苣', '生菜', '芹菜',
        // 根莖類
        '馬鈴薯', '番薯', '地瓜', '芋頭', '蓮藕', '牛蒡', '白蘿蔔', '紅蘿蔔', '山藥',
        // 菇類
        '香菇', '金針菇', '杏鮑菇', '鴻禧菇', '舞菇', '木耳', '猴頭菇',
        // 瓜果類
        '番茄', '小番茄', '茄子', '苦瓜', '絲瓜', '冬瓜', '南瓜', '玉米', '玉米筍', '青椒', '紅椒', '彩椒',
        '小黃瓜', '大黃瓜', '秋葵',
        // 蔥薑蒜
        '蔥', '薑', '大蒜', '洋蔥', '紅蔥頭', '辣椒',
        // 豆類
        '毛豆', '四季豆', '長豆', '豌豆', '紅豆', '綠豆', '黑豆',
        // 主食
        '米飯', '白飯', '麵條', '烏龍麵', '拉麵', '米粉', '冬粉', '寬粉', '麵線', '義大利麵', '吐司', '饅頭',
        // 調味料
        '醬油', '鹽', '糖', '白醋', '烏醋', '米酒', '味噌', '豆瓣醬', '辣豆瓣醬', '番茄醬', '蠔油', '魚露',
        '麻油', '芝麻油', '沙拉油', '橄欖油', '花椒', '八角',
        // 其他常見食材
        '泡菜', '豆芽菜', '綠豆芽', '黃豆芽', '花生', '腰果', '芝麻', '海帶', '昆布', '柴魚'
    ];

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
    const modalDownloadBtn = document.getElementById('modal-download-btn');

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

    addBtn.addEventListener('click', () => {
        closeAutocomplete();
        addIngredient();
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

    modalDownloadBtn.addEventListener('click', () => {
        if (currentModalRecipe) downloadRecipeSnapshot(currentModalRecipe);
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

        modalOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
        document.body.style.overflow = '';
        currentModalRecipe = null;
    }

    function buildRecipeCard(r, index) {
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

        card.innerHTML = `
            ${imageHtml}
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

    // --- Snapshot download (PNG) ---
    function safeFilename(name) {
        // Strip characters not allowed on Windows / common filesystems.
        return String(name).replace(/[\\/:*?"<>|\x00-\x1F]/g, '_').trim() || 'recipe';
    }

    async function downloadRecipeSnapshot(r) {
        // Wait for webfonts so the rendered PNG uses the same typography as the page.
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (e) { /* non-fatal */ }
        }

        const W = 720;
        const PAD = 56;
        const contentW = W - PAD * 2;
        const dpr = Math.max(2, window.devicePixelRatio || 1);
        const fontFamily = '"Noto Serif TC", "PingFang TC", "Microsoft JhengHei", serif';

        // Off-screen measurement context for line wrapping.
        const measure = document.createElement('canvas').getContext('2d');

        function wrap(text, font, maxWidth) {
            measure.font = font;
            // Char-by-char wrap so Chinese text breaks naturally.
            const chars = Array.from(String(text));
            const lines = [];
            let line = '';
            for (const ch of chars) {
                const test = line + ch;
                if (measure.measureText(test).width > maxWidth && line) {
                    lines.push(line);
                    line = ch;
                } else {
                    line = test;
                }
            }
            if (line) lines.push(line);
            return lines.length ? lines : [''];
        }

        // Build draw queue with y already resolved; do a single measure-and-layout pass.
        const ops = [];
        let y = PAD;

        function addText(text, opts) {
            const { font, color, x = PAD, lineHeight, maxWidth = contentW, gap = 0 } = opts;
            const lines = wrap(text, font, maxWidth);
            for (const line of lines) {
                ops.push({ type: 'text', text: line, font, color, x, y });
                y += lineHeight;
            }
            y += gap;
        }

        function addLine({ x1, x2, color, width = 1, gap = 0 }) {
            ops.push({ type: 'line', x1, x2, y, color, width });
            y += gap;
        }

        // === Title ===
        addText(r.name, {
            font: `600 30px ${fontFamily}`, color: '#2a2622', lineHeight: 42, gap: 10,
        });
        addLine({ x1: PAD, x2: PAD + 72, color: '#d97a3d', width: 3, gap: 26 });

        // === Meta ===
        const appliances = (r.required_appliances || []).filter(Boolean);
        const metaFont = `400 15px ${fontFamily}`;
        if (r.cook_time) {
            addText(`烹飪時間：${r.cook_time} 分鐘`,
                { font: metaFont, color: '#6b6359', lineHeight: 24 });
        }
        if (appliances.length) {
            addText(`所需廚具：${appliances.join('、')}`,
                { font: metaFont, color: '#6b6359', lineHeight: 24 });
        }
        if (r.cook_time || appliances.length) y += 16;

        // === Ingredients ===
        addText('食材', {
            font: `600 19px ${fontFamily}`, color: '#8a4a1c', lineHeight: 30, gap: 6,
        });
        (r.ingredients || []).forEach(ing => {
            addText(`・${ing}`, {
                font: `400 16px ${fontFamily}`, color: '#2a2622',
                lineHeight: 26, x: PAD + 8, maxWidth: contentW - 8,
            });
        });
        y += 18;

        // === Steps ===
        addText('步驟', {
            font: `600 19px ${fontFamily}`, color: '#8a4a1c', lineHeight: 30, gap: 6,
        });
        (r.steps || []).forEach((step, i) => {
            addText(`${i + 1}.  ${step}`, {
                font: `400 16px ${fontFamily}`, color: '#2a2622',
                lineHeight: 28, x: PAD + 8, maxWidth: contentW - 8, gap: 4,
            });
        });

        y += 28;
        addLine({ x1: PAD, x2: W - PAD, color: '#d9cfc1', width: 1, gap: 14 });
        addText(`由「今晚，煮點什麼？」匯出 · ${new Date().toLocaleString()}`, {
            font: `italic 12px ${fontFamily}`, color: '#9a9081', lineHeight: 18,
        });

        const H = y + PAD;

        // === Render ===
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.textBaseline = 'top';

        // Paper background to match site
        ctx.fillStyle = '#fdfaf4';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#d9cfc1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0.75, 0.75, W - 1.5, H - 1.5);

        for (const op of ops) {
            if (op.type === 'text') {
                ctx.font = op.font;
                ctx.fillStyle = op.color;
                ctx.fillText(op.text, op.x, op.y);
            } else if (op.type === 'line') {
                ctx.strokeStyle = op.color;
                ctx.lineWidth = op.width;
                ctx.beginPath();
                ctx.moveTo(op.x1, op.y);
                ctx.lineTo(op.x2, op.y);
                ctx.stroke();
            }
        }

        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeFilename(r.name)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
    }

    // --- Autocomplete ---
    let acIndex = -1; // keyboard-highlighted index

    // Build and mount the dropdown DOM node once
    const acList = document.createElement('ul');
    acList.className = 'autocomplete-list';
    acList.setAttribute('role', 'listbox');
    acList.id = 'ingredient-autocomplete';
    inputEl.closest('.input-wrapper').appendChild(acList);

    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('aria-autocomplete', 'list');
    inputEl.setAttribute('aria-controls', 'ingredient-autocomplete');

    function getMatches(query) {
        if (!query) return [];
        const q = query.toLowerCase();
        return COMMON_INGREDIENTS.filter(item =>
            item.toLowerCase().includes(q) && !ingredients.includes(item)
        ).slice(0, 8);
    }

    function highlightMatch(text, query) {
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return escapeHtml(text);
        return escapeHtml(text.slice(0, idx)) +
            `<span class="ac-match">${escapeHtml(text.slice(idx, idx + query.length))}</span>` +
            escapeHtml(text.slice(idx + query.length));
    }

    function renderAutocomplete(matches, query) {
        acList.innerHTML = '';
        acIndex = -1;
        if (!matches.length) return;

        matches.forEach((item, i) => {
            const li = document.createElement('li');
            li.className = 'autocomplete-item';
            li.setAttribute('role', 'option');
            li.setAttribute('data-value', item);
            li.innerHTML = highlightMatch(item, query);

            li.addEventListener('mousedown', (e) => {
                // Use mousedown so it fires before input blur
                e.preventDefault();
                selectItem(item);
            });
            li.addEventListener('mousemove', () => {
                setActiveIndex(i);
            });
            acList.appendChild(li);
        });

        const hint = document.createElement('div');
        hint.className = 'autocomplete-hint';
        hint.textContent = '↑↓ 選擇  Enter 加入  Esc 關閉';
        acList.appendChild(hint);
    }

    function setActiveIndex(idx) {
        const items = acList.querySelectorAll('.autocomplete-item');
        items.forEach((el, i) => el.classList.toggle('active', i === idx));
        acIndex = idx;
        if (items[idx]) {
            items[idx].scrollIntoView({ block: 'nearest' });
        }
    }

    function selectItem(value) {
        inputEl.value = value;
        closeAutocomplete();
        addIngredient();
    }

    function closeAutocomplete() {
        acList.innerHTML = '';
        acIndex = -1;
    }

    inputEl.addEventListener('input', () => {
        const q = inputEl.value.trim();
        const matches = getMatches(q);
        renderAutocomplete(matches, q);
    });

    inputEl.addEventListener('keydown', (e) => {
        const items = acList.querySelectorAll('.autocomplete-item');
        const hasDropdown = items.length > 0;

        if (e.key === 'ArrowDown') {
            if (!hasDropdown) return;
            e.preventDefault();
            setActiveIndex((acIndex + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
            if (!hasDropdown) return;
            e.preventDefault();
            setActiveIndex(acIndex <= 0 ? items.length - 1 : acIndex - 1);
        } else if (e.key === 'Enter') {
            if (hasDropdown && acIndex >= 0 && items[acIndex]) {
                e.preventDefault();
                selectItem(items[acIndex].dataset.value);
            } else {
                closeAutocomplete();
                addIngredient();
            }
        } else if (e.key === 'Escape') {
            closeAutocomplete();
        }
    });

    inputEl.addEventListener('blur', () => {
        // Small delay so mousedown on a list item fires first
        setTimeout(closeAutocomplete, 150);
    });

    // --- Functions ---
    function addIngredient() {
        const val = inputEl.value.trim();
        if (val && !ingredients.includes(val)) {
            ingredients.push(val);
            renderTags();
        }
        inputEl.value = '';
        closeAutocomplete();
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

});
