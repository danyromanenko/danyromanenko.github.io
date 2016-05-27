var app = require('../task1/script.js');

describe("app", function() {
  it("it should call pow method", function() {

  //prepare
  var result;
  //act
  result = app.Pow(5,2);
  //assert
    expect(result).toEqual(25);
  });
});

describe("app", function() {
  it("it should call pow method", function() {

  //prepare
  var result;
  //act
  result = app.Pow(4,4);
  //assert
    expect(result).toEqual(256);
  });
});

describe("app", function() {
  it("it should call pow method", function() {

  //prepare
  var result;
  //act
  result = app.Pow(15,3);
  //assert
    expect(result).toEqual(3375);
  });
});
