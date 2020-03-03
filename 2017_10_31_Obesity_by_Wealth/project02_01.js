(function() {
  var margin = { top: 15, left: 50, right: 10, bottom: 25},
    height = 800 - margin.top - margin.bottom,
    width = 800 - margin.left - margin.right;

  var svg = d3.select("#chart-1")
    .append("svg")
	.attr("height", height + margin.top + margin.bottom)
	.attr("width", width + margin.left + margin.right)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var xTicks = ["Less than $15,000", "$15,000 - $24,999", "$25,000 - $34,999", "$35,000 - $49,999", "$50,000 - $74,999", "$75,000 or greater"];
  var xPositionScale = d3.scaleBand()
  	.domain(xTicks)
    .range([0, width])
    .padding(.15)
  var yPositionScale = d3.scaleLinear()
    .domain([20, 35])
    .range([height, 0])
  var colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  d3.queue()
    .defer(d3.csv, "wealth_and_obesity_year.csv", function(d) {
      return d;
    })
    .await(ready);

	var line = d3.line()
	  .x(function (d) {
	    return xPositionScale(d['Income'])+xPosition_adjustment
	  })
	  .y(function (d) {
	    return yPositionScale(d['Data_Value'])
	  })

  function ready(error, datapoints) {

    var datapoints_nested = d3.nest()
      .key(function(d) {return d.YearStart;})
      .entries(datapoints)
    datapoints_nested = datapoints_nested.map(function(d){
    	d["values"] = d["values"].sort(function(a, b){
	    	return xTicks.indexOf(a["Income"]) - xTicks.indexOf(b["Income"]);
    	});
    	return d;
    })

	var xShift = - margin.left + xPositionScale.step() * xPositionScale.padding();

	xPosition_adjustment = 55;
    svg.selectAll(".OWYcircle")
      .data(datapoints)
      .enter().append("circle")
      .attr("circle", "OWYcircle")
      .attr("r", 4)
      .attr("cx", function(d) {
      	// console.log(xPositionScale(d["Income"]))
        return xPositionScale(d["Income"])+xPosition_adjustment
      })
      .attr("cy", function(d) {
      	// console.log(yPositionScale(d["Data_Value"]))
        return yPositionScale(d["Data_Value"])
      })
      .attr("fill", function(d){
        return colorScale(d['YearStart']);
      })


	svg.selectAll("path")
      .data(datapoints_nested)
      .enter().append("path")
      .attr("d", function(d) {
      	console.log(d.values);
      	return line(d.values); 
      })
      .style("fill", "none")
      .style("stroke-width", 2)
      .style("stroke", function(d){
      	return colorScale(d['key']); })


	var Country_text = svg.append("g")
	  .selectAll("text").data(datapoints_nested).enter().append("text")
	  .text(function( d, i ){ return d["key"].toUpperCase(); })
	  .attr("x", function(d) {
    	var last_element = d.values[5];
      return 70 + xPositionScale(last_element['Income']);
    })
	  .attr("y", function(d){
		  var last_element = d.values[5];
      return yPositionScale(last_element['Data_Value']);
    })
	  .attr("class", "cool_text")
    .attr("fill", function(d){
      return colorScale(d['key']);
    })

    var yAxis = d3.axisLeft(yPositionScale);
    svg.append("g")
      .attr("class", "axis y-axis")
      .call(yAxis);

    var xAxis = d3.axisBottom(xPositionScale)
    svg.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
      // .style("font", 14px)

  }

})();