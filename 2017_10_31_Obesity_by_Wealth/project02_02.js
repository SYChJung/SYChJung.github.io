(function() {
  var margin = { top: 15, left: 25, right: 10, bottom: 25},
    height = 400 - margin.top - margin.bottom,
    width = 300 - margin.left - margin.right;

  var svg = d3.select("#chart-2")
    .append("svg")
	.attr("height", height + margin.top + margin.bottom)
	.attr("width", width + margin.left + margin.right)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");



})();