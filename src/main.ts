import { Chart } from './Chart';
import { GraphQLFetcher } from './GraphQLFetcher';
import { DataFromatter } from './DataFromatter';
import { DataSet } from './DataSet';
import { Data } from './Data';

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(utc)
dayjs.extend(timezone);


function loadingStart() {
    const loadingMsgBox: HTMLElement = <HTMLElement>document.querySelector('#loading_msg');
    loadingMsgBox.style.display = 'block';
}
function loadingEnd() {
    const loadingMsgBox: HTMLElement = <HTMLElement>document.querySelector('#loading_msg');
    loadingMsgBox.style.display = 'none';
}

function getData(dataSet: DataSet, email: string, pass: string, id: string, startDate: string, endDate: string): Promise<DataSet> {
    return new Promise(async (resolve, reject) => {
        const graphqlClient: GraphQLFetcher = new GraphQLFetcher();
        try {
            const token = await graphqlClient.getToken(email, pass);

            let startDayjs = dayjs(startDate);
            let endDayjs = dayjs(endDate);
            let crntDayjs = startDayjs;
            while (crntDayjs <= endDayjs) {
                let headDate = crntDayjs.startOf('month').format('YYYY-MM-DDTHH:mm:ssZ[Z]');
                let tailDate = crntDayjs.endOf('month').format('YYYY-MM-DDTHH:mm:ssZ[Z]');
                let key = crntDayjs.format('YYYY-MM');

                if (!dataSet.hasDate(key)) {
                    let data = await graphqlClient.getUsedData(token.token, id, headDate, tailDate);
                    dataSet.append(key, new Data(data));
                }

                crntDayjs = crntDayjs.add(1, 'M');
            }
            resolve(dataSet);
        } catch (error) {
            console.error(error);
            alert('データ取得に失敗しました');
            const loginPane: HTMLElement = <HTMLElement>document.querySelector('#login_pane');
            loginPane.style.display = 'block';
            loadingEnd();
        }
    });
}

function initController() {
    let radioBtns = document.querySelectorAll<HTMLInputElement>(`input[type='radio'][name='chart_select']`);

    const switchVisChart = () => {
        radioBtns.forEach((target: HTMLInputElement) => {
            let chartId = String(target.id).replace('_slct', '');
            let chart = <HTMLElement>document.querySelector(`#${chartId}`);
            if (target.checked) {
                chart.style.display = 'block';
            } else {
                chart.style.display = 'none';
            }
        });
    }

    radioBtns.forEach((target: HTMLInputElement) => {
        target.addEventListener('change', () => {
            switchVisChart();
            let monthSlcter: HTMLSelectElement = <HTMLSelectElement>document.querySelector('#month_slct');
            let monthChartSlcter = <HTMLInputElement>document.querySelector(`#month_chart_slct`);
            if (monthChartSlcter.checked) {
                monthSlcter.style.display = 'inline';
            } else {
                monthSlcter.style.display = 'none';
            }
        });
    });

    let yearSlcter: HTMLSelectElement = <HTMLSelectElement>document.querySelector('#year_slct');
    let startYear: number = 2021;
    let endYear: number = Number(dayjs().format('YYYY'));
    for (let year = startYear; year <= endYear; year++) {
        let opt: HTMLOptionElement = <HTMLOptionElement>document.createElement('option');
        opt.value = String(year);
        opt.textContent = `${year}年`;
        if (endYear == year) {
            opt.selected = true;
        }
        yearSlcter.appendChild(opt);
    }
    let monthSlcter: HTMLSelectElement = <HTMLSelectElement>document.querySelector('#month_slct');
    Array.from(monthSlcter.children).forEach(elem => {
        let opt = <HTMLOptionElement>elem;
        if (opt.value === dayjs().format('M')) {
            opt.selected = true;
        }
    });
}

function setupParams() {
    let params: any = {}
    location.search.replace('?', '').split('&').forEach(param => {
        let token = param.split('=');
        let key = token[0];
        let value = token[1];
        params[key] = String(value);
    });
    const emailTexarea: HTMLInputElement = <HTMLInputElement>document.querySelector('#email');
    const passTexarea: HTMLInputElement = <HTMLInputElement>document.querySelector('#pass');
    const userIdTexarea: HTMLInputElement = <HTMLInputElement>document.querySelector('#user_id');
    if (Object.keys(params).length == 3) {
        emailTexarea.value = params.mail;
        passTexarea.value = params.pass;
        userIdTexarea.value = params.id;
    }
}

window.onload = () => {
    const submitBtn: HTMLInputElement = <HTMLInputElement>document.querySelector('#submit');
    const emailTexarea: HTMLInputElement = <HTMLInputElement>document.querySelector('#email');
    const passTexarea: HTMLInputElement = <HTMLInputElement>document.querySelector('#pass');
    const userIdTexarea: HTMLInputElement = <HTMLInputElement>document.querySelector('#user_id');

    const body: HTMLElement = <HTMLElement>document.querySelector('body');
    const loginPane: HTMLElement = <HTMLElement>document.querySelector('#login_pane');

    const baseColor = '#1e2a38';
    const lightColor = '#c1d0e6';
    const accentColor = '#eeff00';

    let dataSet: DataSet = new DataSet();

    initController();
    setupParams();


    const maxChartW = 600;
    let chartW = body.clientWidth < maxChartW ? body.clientWidth : maxChartW;
    let chartH = body.clientHeight - 300 < chartW ? body.clientHeight - 300 : chartW;

    const monthlyChart = new Chart('#month_chart', chartW, chartH, { top: 20, right: 50, bottom: 80, left: 50 });
    const yearlyChart = new Chart('#year_chart', chartW, chartH / 2, { top: 20, right: 50, bottom: 60, left: 50 });
    const yearlyHeatmap = new Chart('#heatmap', chartW, chartH / 2, { top: 20, right: 50, bottom: 30, left: 50 });
    const chartPane: HTMLElement = <HTMLElement>document.querySelector('#chart_pane');

    submitBtn.addEventListener('click', async () => {
        loginPane.style.display = 'none';
        loadingStart();
        let thisYear = dayjs().format('YYYY');
        dataSet = await getData(dataSet,
                                String(emailTexarea.value),
                                String(passTexarea.value),
                                String(userIdTexarea.value),
                                `${thisYear}-01`,
                                `${thisYear}-12`);
        // dataSet = await demoDataReader(dataSet);

        let today = dayjs().format('YYYY-MM');
        let dailyData = dataSet.rangeDailyData(today, today);
        monthlyChart.drawBar(dailyData.energy, 'kWh', lightColor);
        monthlyChart.drawLineSub(dailyData.cost, '円', accentColor);

        let monthlyData = dataSet.rangeMonthlyData(thisYear, thisYear);
        yearlyChart.drawBar(monthlyData.energy, 'kWh', lightColor);
        yearlyChart.drawLineSub(monthlyData.cost, '円', accentColor);

        let dailyYearData = dataSet.rangeDailyData(`${thisYear}-01`, `${thisYear}-12`);
        yearlyHeatmap.clear();
        yearlyHeatmap.drawCalHeatmap(dailyYearData.energy, lightColor, baseColor);
        chartPane.style.display = 'block';
        loadingEnd();
    });

    let yearSlcter: HTMLSelectElement = <HTMLSelectElement>document.querySelector('#year_slct');
    let monthSlcter: HTMLSelectElement = <HTMLSelectElement>document.querySelector('#month_slct');
    yearSlcter.addEventListener('change', async () => {
        let thisYear = yearSlcter.value;
        dataSet = await getData(dataSet,
                                String(emailTexarea.value),
                                String(passTexarea.value),
                                String(userIdTexarea.value),
                                `${thisYear}-01`,
                                `${thisYear}-12`);

        let today = `${yearSlcter.value}-${monthSlcter.value}`;
        let dailyData = dataSet.rangeDailyData(today, today);
        monthlyChart.clear();
        monthlyChart.drawBar(dailyData.energy, 'kWh', lightColor);
        monthlyChart.drawLineSub(dailyData.cost, '円', accentColor);

        let monthlyData = dataSet.rangeMonthlyData(thisYear, thisYear);
        yearlyChart.clear();
        yearlyChart.drawBar(monthlyData.energy, 'kWh', lightColor);
        yearlyChart.drawLineSub(monthlyData.cost, '円', accentColor);

        let dailyYearData = dataSet.rangeDailyData(`${yearSlcter.value}-01`, `${yearSlcter.value}-12`);
        yearlyHeatmap.clear();
        yearlyHeatmap.drawCalHeatmap(dailyYearData.energy, lightColor, baseColor);
    });

    monthSlcter.addEventListener('change', async () => {
        let today = `${yearSlcter.value}-${monthSlcter.value}`;
        let dailyData = dataSet.rangeDailyData(today, today);
        monthlyChart.clear();
        monthlyChart.drawBar(dailyData.energy, 'kWh', lightColor);
        monthlyChart.drawLineSub(dailyData.cost, '円', accentColor);

        let thisYear = yearSlcter.value;
        let monthlyData = dataSet.rangeMonthlyData(thisYear, thisYear);
        yearlyChart.clear();
        yearlyChart.drawBar(monthlyData.energy, 'kWh', lightColor);
        yearlyChart.drawLineSub(monthlyData.cost, '円', accentColor);

        let dailyYearData = dataSet.rangeDailyData(`${yearSlcter.value}-01`, `${yearSlcter.value}-12`);
        yearlyHeatmap.clear();
        yearlyHeatmap.drawCalHeatmap(dailyYearData.energy, lightColor, baseColor);
    });



    // function sample(w: number) {
    //     fetch('../tool/sample_data.json')
    //         .then(res => res.json())
    //         .then(data => {
    //             const loginPane: HTMLElement = <HTMLElement>document.querySelector('#login_pane');
    //             loginPane.style.display = 'none';
    //             const dataFormatter = new DataFromatter();
    //             let dailyData = dataFormatter.dailyElectricEnergyData(data);
    //             let thisMDailyData = dataFormatter.slice(dailyData, '2024-01-01 00:00:00', '2024-1-31 23:59:59');
    //             let monthlyData = dataFormatter.monthlyElectricEnergyData(data);
    //             let costData = dataFormatter.costData(monthlyData);
    //             let dailyCumulativeTotalCostData = dataFormatter.dailyCumulativeTotalEstimateCostData(data);

    //             const chart0 = new Chart('#month_chart', w, 400);
    //             const chart1 = new Chart('#year_chart', w, 600);
    //             chart0.drawBar(thisMDailyData, 'kWh', baseColor);
    //             // chart0.drawLineSub(dailyCumulativeTotalCostData, 'Cost (Yen)', accentColor);
    //             console.log(thisMDailyData)
    //             console.log(dailyCumulativeTotalCostData)

    //             chart1.drawBar(monthlyData, 'kWh', baseColor);
    //             chart1.drawLineSub(costData, 'Cost (Yen)', accentColor);

    //             const chart3 = new Chart('#heatmap', w, 300);
    //             chart3.drawCalHeatmap(dailyData, lightColor, baseColor);

    //             const chartPane: HTMLElement = <HTMLElement>document.querySelector('#chart_pane');
    //             chartPane.style.display = 'block';
    //         });
    // }
}


function demoDataReader(dataSet: DataSet): Promise<any> {
    return new Promise(async (resolve, reject) => {
        let result = await fetch('../tool/sample_data.json');
        let jsonMsg: any = await result.json();
        console.log(jsonMsg);

        Object.keys(jsonMsg).forEach(key => {
            // if (!dataSet.hasDate(key)) {
            // }
            let data = new Data(jsonMsg[key]);
            dataSet.append(key, data);
        })
        resolve(dataSet);
    });
}