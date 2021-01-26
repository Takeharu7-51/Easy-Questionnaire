'use strict';
const itemNames = document.getElementsByClassName('questionnaireItemName');
const itemDatas = document.getElementsByClassName('questionnaireItemdata');
const questionnaireName = document.getElementById('questionnaireName');
let items = []; //項目の配列
let datas = []; //項目に対する投票数の配列

for (let i = 0; i < itemNames.length; i++) {
  items.push(itemNames[i].innerText);
}

for (let i = 0; i < itemDatas.length; i++) {
  datas.push(parseFloat(itemDatas[i].innerText.split('・・・')[1].split('件')[0]));
}

makeGraph();

function makeGraph() {
  //円グラフ
  const pieData = [{
    values: datas,
    labels: items,
    type: 'pie',
    textinfo: "label+percent",
  }];

  //棒グラフ
  const barData = [{
    x: items,
    y: datas,
    type: 'bar',
  }];

  //グラフはwidth100%などでwidthを変えることができないのでここで画面のサイズに合わせて設定
  if (window.matchMedia('(max-width: 767px)').matches) { //スマホ処理

    const pieOptions = {
      title: `${questionnaireName.textContent}`,
      width: 400,
      showlegend: false,
    };

    const barOptions = {
      title: `${questionnaireName.textContent}`,
      xaxis: { title: "アンケート項目" },
      yaxis: { title: "人数" },
      width: 400
    };

    graph(pieData, pieOptions, barData, barOptions);

  } else if (window.matchMedia('(min-width:768px)').matches) { //PC処理

    const pieOptions = {
      title: `${questionnaireName.textContent}`,
      showlegend: false,
    };

    const barOptions = {
      title: `${questionnaireName.textContent}`,
      xaxis: { title: "アンケート項目" },
      yaxis: { title: "人数" },
      width: 1000
    };

    graph(pieData, pieOptions, barData, barOptions);

  }

}

function graph(pieData, pieOptions, barData, barOptions) {
  //グラフ表示
  Plotly.newPlot('pieStage', pieData, pieOptions);
  Plotly.plot('barStage', barData, barOptions);
}