/**
 * @param {keyof HTMLElementTagNameMap} tag 
 * @returns {HTMLElement}
 */
const $E = (tag) => document.createElement(tag);

let cache = [null, null, null];
let yearFromOption = 2006;
let yearToOption = new Date().getFullYear();
let grade;
let descending = true;

let compactView = false;
let selectedCategory = null;
let selectedMonth = null;


async function selGrade(g, elem) {
    $('exams').innerHTML = '';
    Array.from(document.getElementsByClassName('grade-btn')).forEach(x => {
        x.classList.remove('selected');
    });
    elem.classList.add('selected');
    grade = g;
    updateList();
}

async function updateList() {
    if (!grade) return;
    let exams = await getExam(grade);
    exams = exams.filter(exam => selectedCategory ? selectedCategory == exam.category : true)
        .filter(exam => selectedMonth ? selectedMonth == exam.month : true)
        .filter(exam => yearFromOption <= exam.year && exam.year <= yearToOption)
        .sort((a, b) => descending ? b.year - a.year : a.year - b.year);
    $('exams').innerHTML = '';
    if (exams.length <= 0) {
        let span = $E('span');
        span.textContent = '검색 결과가 없습니다';
        span.className = 'no-result';
        $('exams').append(span);
    }
    const lim = 100;
    if (compactView) $('exams').append(...exams.slice(0, lim).map(createCompactExamBox));
    else $('exams').append(...exams.slice(0, lim).map(createExamBox));
}

function createExamBox(exam) {
    let outerBox = $E('div');
    outerBox.className = 'exam-wrapper';
    outerBox.style.setProperty('--subject', mappings.category[exam.category]);
    let innerBox = $E('div');
    innerBox.className = 'exam';

    let infoColumn = $E('div');
    let examMonth = `${exam.month}월 `;
    if (exam.type == 3) examMonth = "";

    let nameSpan = span(`${examMonth}${mappings.type[exam.type]}`);
    let nameLine = nameSpan;
    let parityBtn;
    if (exam.parity) {
        nameLine = $E('div');
        nameLine.append(nameSpan);
        parityBtn = $E('button');
        parityBtn.className = 'parity odd';
        parityBtn.innerText = '홀수형';
        parityBtn.onclick = () => {
            if (parityBtn.innerText == '홀수형') {
                parityBtn.innerText = '짝수형';
                parityBtn.className = 'parity even';
            } else {
                parityBtn.innerText = '홀수형';
                parityBtn.className = 'parity odd';
            };
        };
        nameLine.append(parityBtn);
    }

    infoColumn.append(
        span(`${exam.year}년`),
        nameLine,
        span(`${mappings.subject[exam.subject] ?? exam.subject}`),
        span(`${mappings.institute[exam.institute]}`),
    );

    let buttons = $E('div');
    buttons.append(createLinkBtn(exam, 'e873', '문제', parityBtn, true));

    buttons.append(createBtnGroup(
        [exam, 'e179', '정답', parityBtn],
        [exam, 'f075', '해설', parityBtn]
    ));

    buttons.append(createBtnGroup(
        [exam, 'f01f', '듣기', parityBtn],
        [exam, 'f8a7', '대본', parityBtn]
    ));

    innerBox.append(infoColumn, buttons);

    outerBox.append(innerBox);
    return outerBox;
}

function createCompactExamBox(exam) {
    let outerBox = $E('div');
    outerBox.className = 'exam-wrapper';
    outerBox.style.setProperty('--subject', mappings.category[exam.category]);
    let innerBox = $E('div');
    innerBox.className = 'exam compact';

    let infoColumn = $E('div');
    let examMonth = `${exam.month}월`;
    if (exam.type == 3) examMonth = '수능';

    let nameSpan = span(examMonth);
    let nameLine = nameSpan;
    let parityBtn;
    if (exam.parity) {
        nameLine = $E('div');
        nameLine.append(nameSpan);
        parityBtn = $E('button');
        parityBtn.className = 'parity odd';
        parityBtn.innerText = '홀';
        parityBtn.onclick = () => {
            if (parityBtn.innerText == '홀') {
                parityBtn.innerText = '짝';
                parityBtn.className = 'parity even';
            } else {
                parityBtn.innerText = '홀';
                parityBtn.className = 'parity odd';
            };
        };
        nameLine.append(parityBtn);
    }

    infoColumn.append(
        span(`${String(exam.year).slice(2)}년`),
        nameLine,
        span(`${mappings.subject[exam.subject] ?? exam.subject}`)
    );

    let buttons = $E('div');
    buttons.append(createLinkBtn(exam, 'e873', '문제', parityBtn, true));

    buttons.append(createBtnGroup(
        [exam, 'e179', '정답', parityBtn],
        [exam, 'f075', '해설', parityBtn]
    ));

    buttons.append(createBtnGroup(
        [exam, 'f01f', '듣기', parityBtn],
        [exam, 'f8a7', '대본', parityBtn]
    ));

    innerBox.append(infoColumn, buttons);

    outerBox.append(innerBox);
    return outerBox;
}

async function getExam(grade) {
    let data = cache[grade - 1];
    if (!data) data = await fetchExam(grade);
    cache[grade - 1] = data;
    return data;
}

async function fetchExam(grade) {
    if (!mappings) mappings = await fetchJSON('assets/mappings.json');

    let r = await fetch(`exams/${grade}`);
    let blob = await r.blob();
    const decomp = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    let data = await new Response(decomp).json();

    let exams = [];
    data.forEach(d => {
        const i = d.split('|');
        let month = parseInt(i[2]);
        if (month == 5) month = 4;
        let obj = {
            year: parseInt(i[1]),
            month: month,
            category: i[3],
            subject: i[4],
            link: {
                '문제': i[5],
                '정답': i[6],
                '해설': i[7],
                '듣기': i[8],
                '대본': i[9]
            },
            type: i[10],
            institute: i[11],
            parity: i[12],
            parityLink: {
                '문제': i[13],
                '정답': i[14],
                '해설': i[15],
                '듣기': i[16],
                '대본': i[17]
            }
        };
        Object.keys(obj).forEach(key => {
            if (obj[key] === undefined) {
                delete obj[key];
            }
        });
        exams.push(obj);
    });
    return exams;
}

function span(text) {
    let s = $E('span');
    s.innerText = text;
    return s;
}

async function fetchJSON(url) {
    return (await fetch(url)).json();
}

function createLinkBtn(exam, icon, name, parityBtn, vert) {

    const getInfo = () => {
        let parityText = parityBtn ? parityBtn.innerText : '';
        let link;
        if (!parityBtn || parityBtn.classList.contains('odd')) link = exam.link[name] || exam.parityLink[name];
        else link = exam.parityLink[name] || exam.link[name];
        if (exam.link[name] == exam.parityLink[name]) parityText = '';
        if (!exam.link[name] || !exam.parityLink[name]) parityText = '';
        link = `https://wdown.ebsi.co.kr/W61001/01exam/${link}`;
        let shortName = [
            `고${grade}`,
            `${exam.year.toString().substring(2)}년`,
            `${exam.month}월`,
            mappings.subject[exam.subject] ?? exam.subject,
            parityText
        ].filter(x => x).join(' ');
        return { link, shortName };
    }

    let btn = $E('button');
    btn.classList.add('link-btn');
    btn.onclick = async (e) => {
        let { link, shortName } = getInfo();

        if (navigator.pdfViewerEnabled && !e.shiftKey)
            window.open(link, '_blank');
        else {
            if (btn.classList.contains('downloading')) return;
            btn.classList.add('downloading');
            let ext = link.split('.').at(-1);
            let url = link;

            const xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
            await new Promise((resolve) => {
                xhr.onprogress = (e) => {
                    if (!e.lengthComputable) return;
                    btn.style.setProperty('--p', `${e.loaded / e.total * 100}%`);
                };
                xhr.onloadend = resolve;
                xhr.ontimeout = resolve;
                xhr.open('GET', url, true);
                xhr.send();
            });

            btn.classList.remove('downloading');
            btn.style.setProperty('--p', '0%');

            let a = $E('a');
            a.href = URL.createObjectURL(xhr.response);
            a.download = `${shortName} ${name}.${ext}`;
            a.click();
        }
    };
    if (vert) btn.classList.add('vert');
    let iconElem = $E('span');
    iconElem.className = 'icon';
    iconElem.innerHTML = `&#x${icon};`;
    btn.append(iconElem);
    if (!compactView) btn.append(span(name));
    return btn;
}

function createBtnGroup(...options) {
    let buttons = $E('div');
    let vert = !options.every(x => x[0].link[x[2]] || x[0].parityLink[x[2]]);
    options.forEach(x => {
        if (x[0].link[x[2]] || x[0].parityLink[x[2]]) buttons.append(createLinkBtn(x[0], x[1], x[2], x[3], vert));
    });
    return buttons;
}

function createYearOptions(from) {
    let elems = [];
    for (let i = 2006; i <= new Date().getFullYear(); i++) {
        let option = $E('option');
        option.value = i.toString();
        option.textContent = i.toString();
        elems.push(option);
    }
    if (from) elems[0].selected = true;
    elems.reverse();
    return elems;
}

function selSort(elem) {
    descending = !descending;
    if (descending) elem.innerHTML = `<span class="icon">&#xe5db;</span><span>내림차순</span>`;
    else elem.innerHTML = `<span class="icon">&#xe5d8;</span><span>오름차순</span>`;
    updateList();
}

function displayStyle(elem) {
    let s = elem.querySelector('span');
    compactView = !compactView;
    if (compactView) s.innerHTML = '&#xe8ee;';
    else s.innerHTML = '&#xe8e9;';
    updateList();
    localStorage.setItem('compactView', compactView);
}