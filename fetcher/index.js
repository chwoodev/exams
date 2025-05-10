const fs = require('fs/promises');
const { createWriteStream } = require('fs');
const cheerio = require('cheerio');
const getInfo = require('./parser');
const mappings = require('./mappings.json');

let subjects = new Set();

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

        for (const exam of Array.from($('.board_qusesion').children().children()).reverse()) {
            let name = $(exam).find('.tit').text().trim().replace(/\s+/g, ' ');
            if (obj.some(x => x.name == name)) {
                // console.log(`SKIP: ${name}`);
                continue;
            }
            let count = parseInt($(exam).find('.txt_info').children().first().text());
            let category = $(exam).find('.img>img').attr('src').match(/thumb_book_(.+).png/)?.at(1);
            let buttons = $(exam).find('.btn_row.btn_down_row');
            let links = {};
            buttons.children().each((j, btn) => {
                links[$(btn).text()] = $(btn).attr('onclick').match(/'(.*?)'/)[1]
                    .replace(/https?:\/\/wdown.ebsi.co.kr\/W61001\/01exam/, '')
                    .replace(/^\//, '');
            });
            let info = getInfo(name);
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
    options.set('subjList', '1,2,3,4,5,6,7,8,9,10');
    options.set('beginYear', 2006);
    options.set('endYear', new Date().getFullYear());
    options.set('monthAll', 'on');
    options.set('subjAll', 'on');
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