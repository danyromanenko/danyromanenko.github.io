(function nameList() {
    var i;
    var arr = [];
    for (i = 1; i <= 5; i++) {
        arr.push(prompt('Введите имя №' + i));
    }
    var name = prompt('Введите ваше имя пользователя');
    
    function nameCompare(name) {
        for (var i = 0; i < nameList.length; ++i) {
        if (nameList[i] === name) {
        return "Your name: " + nameList[i]
    }
  }
    return false;
}
    (arr.indexOf(name) != -1) ? (alert(name+', вы успешно вошли')) : (alert('Имя '+name+' не найдено'));
})();