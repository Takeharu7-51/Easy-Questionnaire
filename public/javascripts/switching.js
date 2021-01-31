'use strict';

//メニューの表示切り替え
const array = ['b', 'c', 'd', 'e', 'f'];
array.forEach((menu) => {
  document.getElementById(menu).style.display = "none";
});

function switching(data) {
  const menus = ['a', 'b', 'c', 'd', 'e', 'f'];
  document.getElementById(data).style.display = "block";
  menus.filter(n => n !== data).forEach((menu) => {
    document.getElementById(menu).style.display = "none";
  });
}

//クリップボードにコピー
function copyToClipboard() {
  var copyTarget = document.getElementById("copyTarget");
  copyTarget.select();
  document.execCommand("Copy");
}
