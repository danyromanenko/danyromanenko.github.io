var app = {
Pow: function(a,n) {

var b = a
while(--n) {
 a = a*b
}
return a;
}
}

module.exports = app;