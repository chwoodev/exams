module.exports = function getInfo(x) {
    let year = x.match(/(\d+)년/)[1];
    let month = parseInt(x.match(/(\d+)월/)?.at(1));
    let institute = x.match(/\((.+?)\)/)?.at(1);
    let type = x.match(/(학평|모평|학력평가|모의평가)\s*?\(.+?\)/)?.at(1);
    if (type == '학력평가') type = '학평';
    if (type == '모의평가') type = '모평';
    if (x.includes('대학수학능력시험')) {
        month = 11;
        type = '수능';
        institute = '평가원';
    }
    let parity;
    if (x.includes('홀수형')) parity = '홀수형';
    if (x.includes('짝수형')) parity = '짝수형';
    let tmp = x;
    if (parity) tmp = tmp.replace(parity, '');
    tmp = tmp.trim();
    let subject = tmp.replace(/.*(\)|대학수학능력시험|시행)/, '').replace(/\s/g, '');

    //2012년 14학년도 예비시행
    if (x.includes('예비시행') && year == 2012) {
        type = '예비';
        month = 5;
    }

    return { year, month, institute, type, parity, subject };
}