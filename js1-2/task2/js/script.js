(function(){
    var i;
    var arr = [];
    for (i = 1; i <= 5; i++) {
        arr.push(prompt('Введите имя №'+i));
    }
    var name = prompt('Введите ваше имя пользователя');
    (arr.indexOf(name) != -1) ? (alert(name+', вы успешно вошли')) : (alert('Имя '+name+' не найдено'));
})();