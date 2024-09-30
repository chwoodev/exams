const $ = (id) => document.getElementById(id);

let mappings;

(async () => {
    compactView = localStorage.getItem('compactView') == "true";
    if (compactView) $('display-btn').firstElementChild.innerHTML = '&#xe8ee;';
    mappings = await fetchJSON('assets/mappings.json');
    createOptions();
    createMonthOptions();
    await checkReload();
    document.querySelectorAll('.grade-btn').forEach((x, idx) => {
        x.onclick = () => selGrade(idx + 1, x);
        x.disabled = false;
    });
})();

async function checkReload() {
    let reloaded = window.performance
        .getEntriesByType('navigation')
        .map((nav) => nav.type)
        .includes('reload');
    if (!reloaded) return;
    for (const i of [1, 2, 3]) {
        await fetchExam(i);
    }
}

function createOptions() {
    let box;
    mappings.category.slice(1).forEach((x, idx) => {
        if (idx % 4 == 0) {
            box = $E('div');
            box.className = 'nobreak';
            $('subject-row').append(box);
        }
        let btn = $E('button');
        btn.className = 'subject-btn';
        btn.onclick = () => {
            let selected = btn.classList.contains('selected');
            document.querySelectorAll('#subject-row .selected').forEach(x => x.classList.remove('selected'));
            if (selected) selectedCategory = null;
            else {
                btn.classList.toggle('selected', true);
                selectedCategory = idx + 1;
            }
            updateList();
        };
        btn.innerHTML = `<svg height="15" width="15">
        <circle r="50%" cx="50%" cy="50%" fill="${mappings.category[idx + 1]}"/>
        </svg>
        <span>${mappings.categoryName[idx + 1]}</span>`;
        box.append(btn);
    });

    const yearFrom = $('year-from');
    const yearTo = $('year-to');
    yearFrom.append(...createYearOptions(true));
    yearFrom.oninput = () => {
        let fromVal = parseInt(yearFrom.value);
        let toVal = parseInt(yearTo.value);
        if (toVal < fromVal) yearTo.value = fromVal;
        yearFromOption = parseInt(yearFrom.value);
        yearToOption = parseInt(yearTo.value);
        updateList();
    };
    yearTo.append(...createYearOptions());
    yearTo.oninput = () => {
        let fromVal = parseInt(yearFrom.value);
        let toVal = parseInt(yearTo.value);
        if (toVal < fromVal) yearFrom.value = toVal;
        yearFromOption = parseInt(yearFrom.value);
        yearToOption = parseInt(yearTo.value);
        updateList();
    };
}

function createMonthOptions() {
    const monthRow = $('month-row');
    [3, 4, 6, 7, 9, 10, 11].forEach(x => {
        let btn = $E('button');
        btn.textContent = `${x}월`;
        btn.onclick = () => {
            let selected = btn.classList.contains('selected');
            document.querySelectorAll('#month-row .selected').forEach(x => x.classList.remove('selected'));
            if (selected) selectedMonth = null;
            else {
                btn.classList.toggle('selected', true);
                selectedMonth = x;
            }
            updateList();
        };
        monthRow.append(btn);
    });
}
