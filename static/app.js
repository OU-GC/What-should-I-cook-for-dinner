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
    const modalCard = modalOverlay.querySelector('.modal-card');
    const appContainer = document.querySelector('.app-container');
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
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal();
    });

    modalDownloadBtn.addEventListener('click', () => {
        if (currentModalRecipe) downloadRecipeSnapshot(currentModalRecipe);
    });

    // 觸頂/觸底時，把滾動轉發給主頁，用 rAF + 動量做平滑效果
    let scrollVelocity = 0;
    let scrollRafId = null;
    function stepScroll() {
        if (Math.abs(scrollVelocity) < 0.4) {
            scrollVelocity = 0;
            scrollRafId = null;
            return;
        }
        window.scrollBy(0, scrollVelocity);
        scrollVelocity *= 0.82; // 摩擦係數，越小衰減越快
        scrollRafId = requestAnimationFrame(stepScroll);
    }
    modalCard.addEventListener('wheel', (e) => {
        const atTop = modalCard.scrollTop <= 0;
        const atBottom = modalCard.scrollTop + modalCard.clientHeight >= modalCard.scrollHeight - 1;
        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
            e.preventDefault();
            scrollVelocity += e.deltaY * 0.25; // 衝量
            if (!scrollRafId) scrollRafId = requestAnimationFrame(stepScroll);
        }
    }, { passive: false });

    // --- Modal ---
    function openModal(recipe, sourceCard) {
        currentModalRecipe = recipe;
        modalName.textContent = recipe.name;
        const appliances = (recipe.required_appliances || []).filter(Boolean);
        const applianceText = appliances.map(escapeHtml).join(', ') || '無需求';
        modalMeta.innerHTML = `
            <span><i class="fa-regular fa-clock"></i> ${recipe.cook_time ? recipe.cook_time + ' 分鐘' : '—'}</span>
            <span><i class="fa-solid fa-kitchen-set"></i> ${applianceText}</span>
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
        positionModalAt(sourceCard);
    }

    function positionModalAt(sourceCard) {
        if (!sourceCard || !appContainer) return;
        const cardRect = sourceCard.getBoundingClientRect();
        const containerRect = appContainer.getBoundingClientRect();
        const top = cardRect.top - containerRect.top;
        const modalWidth = modalCard.offsetWidth;
        const maxLeft = Math.max(0, containerRect.width - modalWidth);
        let left = cardRect.left - containerRect.left;
        if (left > maxLeft) left = maxLeft;
        if (left < 0) left = 0;
        modalCard.style.top = `${top}px`;
        modalCard.style.left = `${left}px`;
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
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
                    <span><i class="fa-solid fa-kitchen-set"></i> ${appliances.length ? appliances.map(escapeHtml).join(', ') : '無需求'}</span>
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

        card.addEventListener('click', () => openModal(r, card));
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
        const safe = escapeHtml(value);
        label.innerHTML = `
            <input type="checkbox" name="appliance" value="${safe}" ${checked ? 'checked' : ''}>
            <span class="toggle-content">${safe}</span>
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

        const hint = '食材或廚具不存在。請修正後再試一次。';

        invalidNotice.innerHTML =
            `<div class="invalid-icon"><i class="fa-solid fa-circle-exclamation"></i></div>` +
            `<strong>偵測到無法辨識的輸入</strong>` +
            `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` +
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

    // =========================================================
    // === SPA Routing =========================================
    // =========================================================
    const PAGES = ['home', 'cooking', 'storage'];

    function switchPage(page) {
        if (!PAGES.includes(page)) page = 'home';
        PAGES.forEach(p => {
            const el = document.getElementById('page-' + p);
            if (el) el.classList.toggle('hidden', p !== page);
        });
        document.querySelectorAll('.topnav-link').forEach(a => {
            a.classList.toggle('active', a.dataset.page === page);
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (page === 'cooking') buildCookingPage();
        if (page === 'storage') buildStoragePage();
    }

    function getPage() {
        const h = (location.hash || '#home').replace('#', '');
        return PAGES.includes(h) ? h : 'home';
    }

    window.addEventListener('hashchange', () => switchPage(getPage()));

    // Hamburger menu
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.querySelector('.topnav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
        document.querySelectorAll('.topnav-link').forEach(a =>
            a.addEventListener('click', () => navLinks.classList.remove('open'))
        );
    }

    // =========================================================
    // === Cooking Skills Page Data & Builder ==================
    // =========================================================
    let cookingBuilt = false;
    const COOKING_SKILLS = [
        {
            categoryIcon: 'fa-solid fa-utensils',
            category: '基礎刀法',
            items: [
                { icon: 'fa-solid fa-border-all', name: '切丁', desc: '將食材先切成長條，再橫切成小方塊。小丁約 0.5cm、大丁約 1.5cm，常用於炒飯、沙拉、燉菜。', tip: '切洋蔥時先對半、根部不切斷，直切再橫切，眼淚少很多！' },
                { icon: 'fa-solid fa-grip-lines', name: '切片', desc: '將食材垂直於纖維方向橫切成薄片，厚度視料理需求約 2–5mm。用於炒肉、火鍋、涼拌。', tip: '肉片逆紋切（垂直肌肉纖維），口感更嫩、不塞牙。' },
                { icon: 'fa-solid fa-bars', name: '切絲', desc: '先切成薄片，再順向切成細絲。寬度約 2–3mm。常用於炒菜絲、泡菜、涼拌。', tip: '片先疊起來再切絲，效率快三倍！' },
                { icon: 'fa-solid fa-ellipsis', name: '切末 / 剁碎', desc: '將食材切成極細的顆粒（<2mm）。蒜末、薑末、辣椒末都用這招，爆香效果最好。', tip: '刀身拍平大蒜後再剁，皮更好剝、也更容易剁細。' },
                { icon: 'fa-solid fa-rotate', name: '滾刀切', desc: '每切一刀就把食材滾動 45–90°，切出不規則的大塊面。讓食材受熱面積更大、入味更快。', tip: '適合根莖類如馬鈴薯、紅蘿蔔、竹筍，燉煮不易散。' },
                { icon: 'fa-solid fa-slash', name: '斜切', desc: '刀與砧板保持 45° 斜角切割。可增大切面、讓肉更嫩、讓蔥段更美觀。', tip: '切蔥段、蘆筍、青椒時斜切，賣相立刻升級！' },
            ]
        },
        {
            categoryIcon: 'fa-solid fa-fire-burner',
            category: '常見烹飪術語',
            items: [
                { icon: 'fa-solid fa-water', name: '汆燙', desc: '將食材放入沸水中快速燙熟後撈起，用於去除腥味、定色或預熟。時間短，通常 30 秒至 2 分鐘。', tip: '燙葉菜加一點鹽和油，顏色更翠綠不變黃。' },
                { icon: 'fa-solid fa-fire', name: '爆香', desc: '用大火快速煸炒蔥薑蒜辣椒等辛香料，逼出香氣再下其他食材。是中式料理的靈魂起手式。', tip: '油要夠熱（微微冒煙）再下蔥蒜，香氣才出得來。' },
                { icon: 'fa-solid fa-droplet', name: '勾芡', desc: '將太白粉或玉米粉加水調勻，倒入鍋中收汁讓湯汁變濃稠，讓醬汁裹附在食材上。', tip: '勾芡水要邊攪邊倒、分次加，才不會結塊。' },
                { icon: 'fa-solid fa-arrow-down', name: '收汁', desc: '開大火持續翻炒，讓鍋中水分蒸發、醬汁變得濃稠有光澤。讓味道更集中。', tip: '收汁時要不停翻炒，避免底部燒焦。' },
                { icon: 'fa-solid fa-cloud', name: '悶煮', desc: '蓋上鍋蓋，用鍋內蒸氣與餘熱繼續把食材燜熟。節能又保留水分，適合雞肉、魚類。', tip: '電鍋外鍋放水，按下後就是標準悶煮——最省力！' },
                { icon: 'fa-solid fa-snowflake', name: '過水 / 沖冷水', desc: '汆燙後立刻泡入冰水或沖冷水，快速降溫停止加熱，讓蔬菜保持脆感與鮮色。', tip: '沒有冰塊就用冷水多沖幾次，效果差不多。' },
            ]
        },
        {
            categoryIcon: 'fa-solid fa-temperature-half',
            category: '火候控制',
            items: [
                { icon: 'fa-solid fa-fire-flame-curved', name: '大火', desc: '火焰最大、鍋溫最高（約 250°C 以上）。適合爆炒、快炒、收汁。食材在鍋中時間極短，保留脆嫩口感。', tip: '大火快炒時食材要提前切好、醬料備好，動作要快。' },
                { icon: 'fa-solid fa-fire', name: '中火', desc: '火焰中等、鍋溫穩定（約 150–200°C）。適合煎、炒、煮湯。大多數料理的主力火候。', tip: '煎肉排時先中大火上色，再轉中小火煮熟，外脆內嫩。' },
                { icon: 'fa-solid fa-fire-flame-simple', name: '小火', desc: '火焰最小、溫度最低（約 80–120°C）。適合燉煮、熬湯、做醬料。讓食材慢慢入味。', tip: '燉湯時看到湯面微微冒泡就夠了，滾太大反而湯變混濁。' },
            ]
        }
    ];

    function buildCookingPage() {
        if (cookingBuilt) return;
        cookingBuilt = true;
        const container = document.getElementById('cooking-content');
        if (!container) return;
        container.innerHTML = COOKING_SKILLS.map(cat => `
            <section class="glass-panel">
                <h2 class="category-title">
                    <i class="category-icon ${cat.categoryIcon}"></i>
                    ${cat.category}
                </h2>
                <div class="tutorial-grid">
                    ${cat.items.map(s => `
                        <div class="tutorial-card">
                            <div class="tutorial-card-header">
                                <div class="tutorial-icon"><i class="${s.icon}"></i></div>
                                <div class="tutorial-name">${s.name}</div>
                            </div>
                            <p class="tutorial-desc">${s.desc}</p>
                            <p class="tutorial-tip"><i class="fa-regular fa-lightbulb"></i><span>${s.tip}</span></p>
                        </div>
                    `).join('')}
                </div>
            </section>
        `).join('');
    }

    // =========================================================
    // === Storage Page Data & Builder =========================
    // =========================================================
    let storageBuilt = false;
    const STORAGE_DATA = [
        {
            categoryIcon: 'fa-solid fa-leaf',
            category: '蔬菜類',
            items: [
                { icon: 'fa-solid fa-leaf', name: '高麗菜', days: '7–14 天', method: '整顆冷藏，外葉不要剝掉，用袋子鬆鬆套住保留濕度。', tips: '切開後切面包保鮮膜，儘量 3 天內用完。' },
                { icon: 'fa-solid fa-circle-dot', name: '洋蔥', days: '1–2 個月', method: '放涼爽通風處，不需冷藏。避免與馬鈴薯放在一起。', tips: '切開後密封冷藏，2–3 天用完，切記勿再放室溫。' },
                { icon: 'fa-solid fa-carrot', name: '紅蘿蔔', days: '2–4 週', method: '去葉後套入塑膠袋冷藏，保留濕度。', tips: '如有泥土覆蓋，先不要洗，洗了更快壞。' },
                { icon: 'fa-solid fa-bowl-food', name: '新鮮香菇', days: '5–7 天', method: '用紙袋或廚房紙巾包裹冷藏，避免悶濕。', tips: '若太多吃不完，切片後冷凍，直接下鍋無需解凍。' },
                { icon: 'fa-solid fa-seedling', name: '花椰菜', days: '5–7 天', method: '用濕紙巾包住花球部分，套袋冷藏。', tips: '先汆燙再冷凍可保存 1 個月，口感幾乎不變。' },
                { icon: 'fa-solid fa-apple-whole', name: '番茄', days: '室溫 3–5 天', method: '未熟透放室溫，已熟放冰箱冷藏（4–5 天）。', tips: '蒂頭朝下擺放，減少水分流失，保鮮更久。' },
                { icon: 'fa-solid fa-pepper-hot', name: '小黃瓜', days: '3–5 天', method: '用紙巾包裹後放冷藏蔬果室，避免直接接觸冷氣出口。', tips: '低溫容易出現凍傷斑點，不要放在最冷的地方。' },
                { icon: 'fa-solid fa-seedling', name: '蔥 / 香菜', days: '5–7 天', method: '根部用濕紙巾包住，裝入袋中直立冷藏。', tips: '洗淨切段後，放入密封袋冷凍，隨用隨取超方便。' },
            ]
        },
        {
            categoryIcon: 'fa-solid fa-drumstick-bite',
            category: '肉類 & 海鮮',
            items: [
                { icon: 'fa-solid fa-drumstick-bite', name: '雞肉', days: '冷藏 2 天 / 冷凍 3 個月', method: '分裝成一次份量，冷藏 2 天內使用，否則立即冷凍。', tips: '冷凍前先分裝、壓平，解凍快又好拿。' },
                { icon: 'fa-solid fa-bacon', name: '豬肉 / 牛肉', days: '冷藏 3–5 天 / 冷凍 3–4 個月', method: '原包裝冷藏或分裝冷凍，避免反覆解凍。', tips: '用鹽水浸泡法快速解凍：肉放密封袋，泡常溫鹽水 30 分鐘。' },
                { icon: 'fa-solid fa-shrimp', name: '鮮蝦', days: '冷藏 1–2 天 / 冷凍 3 個月', method: '買回後先去頭、去腸泥，瀝乾後冷凍效果最好。', tips: '冷凍時可用鹽水浸泡，能保持肉質彈性。' },
                { icon: 'fa-solid fa-fish', name: '鮮魚', days: '冷藏 1–2 天 / 冷凍 2 個月', method: '用廚房紙巾吸乾水分，密封後冷藏，最好隔日食用。', tips: '冷凍前先用米酒或薑片醃一下，去腥又保鮮。' },
                { icon: 'fa-solid fa-fish-fins', name: '蛤蜊', days: '活體 1–2 天', method: '放入鹽水（3% 濃度）中吐沙，蓋上濕布放陰涼處或冷藏。', tips: '若短時間沒吃，吐沙後可放入密封袋冷凍，做湯時直接下鍋。' },
                { icon: 'fa-solid fa-bacon', name: '培根 / 火腿', days: '開封後 7 天', method: '開封後緊密包裹或放密封袋冷藏，避免接觸空氣氧化。', tips: '吃不完可切段冷凍，料理炒飯、義大利麵直接用。' },
            ]
        },
        {
            categoryIcon: 'fa-solid fa-egg',
            category: '蛋 & 豆腐 & 乳製品',
            items: [
                { icon: 'fa-solid fa-egg', name: '雞蛋', days: '冷藏 3–5 週', method: '尖端朝下放入冰箱，遠離異味食物（蛋殼有氣孔會吸味）。', tips: '測試新鮮度：放入水中，沉底橫躺最新鮮，豎立就快壞了。' },
                { icon: 'fa-solid fa-cheese', name: '豆腐', days: '開封 2–3 天', method: '未開封照原包裝冷藏；開封後泡入清水，每日換水。', tips: '豆腐冷凍後口感變像海綿，超適合滷、燙火鍋、煮湯。' },
                { icon: 'fa-solid fa-cheese', name: '起司', days: '開封 2–4 週', method: '用蠟紙或保鮮膜緊密包裹，避免接觸空氣，放冷藏。', tips: '如表面有少量白霉，可切除後仍可食用；若全體變色則丟棄。' },
                { icon: 'fa-solid fa-mug-saucer', name: '牛奶', days: '開封後 5–7 天', method: '開封後立刻冷藏，避免放在冰箱門（溫度不穩），放深層。', tips: '快過期的牛奶拿來做白醬或布丁，完全不浪費！' },
            ]
        },
        {
            categoryIcon: 'fa-solid fa-bottle-droplet',
            category: '調味料 & 乾貨',
            items: [
                { icon: 'fa-solid fa-bottle-droplet', name: '醬油', days: '開封後 3–6 個月', method: '開封後冷藏保存，每次使用後確實蓋緊瓶蓋。', tips: '顏色加深、出現沉澱物通常仍可食用，但風味已打折。' },
                { icon: 'fa-solid fa-bowl-rice', name: '白米', days: '1–3 個月', method: '密封放於陰涼乾燥處，可放入幾片乾月桂葉防蟲。', tips: '用米桶或密封容器存放，放入冰箱冷藏可保存更久。' },
                { icon: 'fa-solid fa-wheat-awn', name: '乾香菇 / 木耳', days: '6–12 個月', method: '密封放於乾燥陰涼處，避免潮濕受潮。', tips: '泡發時用冷水或溫水，熱水會讓香菇香氣流失。' },
                { icon: 'fa-solid fa-jar', name: '味噌', days: '開封後 3 個月', method: '開封後密封冷藏，表面可貼一層保鮮膜隔絕空氣。', tips: '顏色變深是正常氧化，不代表變壞，但風味會轉苦。' },
            ]
        }
    ];

    function buildStoragePage() {
        if (storageBuilt) return;
        storageBuilt = true;
        const container = document.getElementById('storage-content');
        if (!container) return;
        container.innerHTML = STORAGE_DATA.map(cat => `
            <section class="glass-panel">
                <h2 class="category-title">
                    <i class="category-icon ${cat.categoryIcon}"></i>
                    ${cat.category}
                </h2>
                <div class="tutorial-grid">
                    ${cat.items.map(s => `
                        <div class="tutorial-card">
                            <div class="tutorial-card-header">
                                <div class="tutorial-icon"><i class="${s.icon}"></i></div>
                                <div class="tutorial-name">${s.name}</div>
                                <span class="tutorial-badge">${s.days}</span>
                            </div>
                            <p class="tutorial-desc">${s.method}</p>
                            <p class="tutorial-tip"><i class="fa-regular fa-lightbulb"></i><span>${s.tips}</span></p>
                        </div>
                    `).join('')}
                </div>
            </section>
        `).join('');
    }

    // =========================================================
    // === Staples Hint Panel ===================================
    // =========================================================
    const staplesToggle = document.getElementById('staples-toggle');
    const staplesContent = document.getElementById('staples-content');
    const staplesTags = document.getElementById('staples-tags');

    if (staplesToggle && staplesContent) {
        staplesToggle.addEventListener('click', () => {
            const expanded = staplesToggle.getAttribute('aria-expanded') === 'true';
            staplesToggle.setAttribute('aria-expanded', String(!expanded));
            staplesContent.classList.toggle('open');
        });
    }

    async function fetchStaples() {
        try {
            const res = await fetch('/api/config/staples');
            const data = await res.json();
            const staples = data.staples || [];
            if (!staples.length || !staplesTags) return;
            staplesTags.innerHTML = staples.map(s =>
                `<span class="staple-tag"><i class="fa-solid fa-check"></i>${escapeHtml(s)}</span>`
            ).join('');
        } catch (e) {
            // Non-fatal: panel stays empty / hidden
            console.warn('Failed to load staples:', e);
        }
    }

    fetchStaples();

    // 初次路由：放在最後，確保所有 const/let 已初始化（避免 TDZ）
    switchPage(getPage());

});
