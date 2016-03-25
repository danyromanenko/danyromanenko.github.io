(function () {
    var a = prompt('Введите число');
    var b = prompt('Введите степень');
    var pow = function(a, b) {
        var res = a;
        if (b === 0) {
            return 1;
        }
        for (var i = 2; i <= b; i++) {
            res *= a;
        }
        return res;
}
    console.log(pow(a, b));
    alert(pow(a, b));
})();
