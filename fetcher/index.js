const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const cheerio = require('cheerio');
const getInfo = require('./parser');
const mappings = require('./mappings.json');

let subjects = new Set();

const categoryMap = new Map(Object.entries({ 
    'kor': 'korean',
    'math': 'math',
    'eng': 'english',
    'his': 'history',
    'soc': 'social',
    'sci': 'science',
    'career': 'job',
    'lang': 'langeage'
}));

(async () => {
    for (const grade of [1, 2, 3]) {
        let html = await fs.readFile(`html/${grade}.html`).catch(() => null);
        if (!html) {
            console.log(grade);
            html = await getHTML(grade);
            await fs.mkdir('html').catch(() => null);
            await fs.writeFile(`html/${grade}.html`, html);
        }
        let obj = JSON.parse((await fs.readFile(`data/${grade}.json`).catch(() => '[]')).toString());

        const $ = cheerio.load(html.toString());

        for (const exam of $('.qus_box').toArray().toReversed()) {
            let name = $(exam).find('.qus_tit').text().trim().replace(/\s+/g, ' ');
            if (obj.some(x => x.name == name)) {
                // console.log(`SKIP: ${name}`);
                continue;
            }
            let count = 0;
            let category = categoryMap.get($(exam).attr('class').split(' ')?.at(1));
            
            let buttons = $(exam).find('dd');
            let links = {};
            buttons.children().each((j, btn) => {
                links[$(btn).text()] = $(btn).attr('onclick').match(/'(.*?)'/)[1]
                    .replace(/https?:\/\/wdown.ebsi.co.kr\/W61001\/01exam/, '')
                    .replace(/^\//, '');
            });

            
            let info = getInfo(name, parseInt($(exam).find('.flag_subject_col_basic').first().text()));
            let standardName = name.replace('짝수형', '').replace('홀수형', '').trim();

            obj.splice(0, 0, {
                name,
                standardName,
                grade,
                category,
                count,
                links,
                info
            });

            console.log(name);
        }

        let comp = [];
        obj.forEach(o => {
            subjects.add(o.info.subject);
            let match = comp.findIndex(x => x[0] == o.standardName);
            if (match != -1) {
                let arr = comp[match];
                if (o.info.parity == '홀수형') {
                    arr.push(arr[5], arr[6], arr[7], arr[8], arr[9]);
                    arr[5] = o.links['문제'];
                    arr[6] = o.links['정답'];
                    arr[7] = o.links['해설'];
                    arr[8] = o.links['듣기'];
                    arr[9] = o.links['대본'];
                } else {
                    arr.push(
                        o.links['문제'],
                        o.links['정답'],
                        o.links['해설'],
                        o.links['듣기'],
                        o.links['대본']
                    );
                }
                comp[match] = arr;
                return;
            }
            comp.push([
                o.standardName,
                o.info.year,
                o.info.month,
                mappings.category[o.category],
                o.info.subject,
                o.links['문제'],
                o.links['정답'],
                o.links['해설'],
                o.links['듣기'],
                o.links['대본'],
                mappings.type[o.info.type],
                mappings.institute[o.info.institute],
                o.info.parity ? 1 : ''
            ]);
        });

        await fs.writeFile(`data/${grade}.json`, JSON.stringify(obj, null, 2));

        comp = comp.map(x => {
            x[0] = '';
            return x.map(y => y ?? '').join('|');
        });

        let ws = createWriteStream(`../exams/${grade}`);
        new Blob([JSON.stringify(comp)], {
            type: 'application/json',
        }).stream().pipeThrough(
            new CompressionStream("gzip")
        ).pipeTo(new WritableStream({
            write(chunk) {
                ws.write(chunk);
            },
        }));
        console.log(grade);
    }
    await fs.writeFile(`data/subjects.json`, JSON.stringify([...subjects], null, 2));

})();

async function getHTML(grade) {
    let options = new URLSearchParams();
    options.set('targetCd', `D${grade}00`);
    options.set('monthList', '01,02,03,04,05,06,07,08,09,10,11,12');


    options.set('yearList', new Date().getFullYear());
    options.set('year', new Date().getFullYear());
    options.set('arOrd', '1,2,3,4,5,,6,7,8');
    options.set('monthAll', 'all');
    options.set('subjIdList', 'firstEnter');
    options.set('sort', 'recent');
    options.set('korArOrd', 1);
    options.set('mathArOrd', 2);
    options.set('engArOrd', 3);
    options.set('hisArOrd', 4);
    options.set('srch1ArOrd', 5);
    options.set('srch2ArOrd', 6);
    options.set('jobArOrd', 7);
    options.set('scndForgnlngArOrd', 8);


    options.set('pageSize', 100);
    let r = await fetch('https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperListAjax.ajax', {
        body: options.toString(),
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
    });
    return await r.text();
}