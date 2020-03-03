(function() {
  var margin = { top: 15, left: 50, right: 120, bottom: 25},
    height = 500 - margin.top - margin.bottom,
    width = 610 - margin.left - margin.right;

  var svg = d3.select("#chart-3")
    .append("svg")
	  .attr("height", height + margin.top + margin.bottom)
	  .attr("width", width + margin.left + margin.right)
	  .append("g")
	  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  var xPositionScale = d3.scaleLinear()
    .domain([1900, 2015])
    .range([0, width])
  var yPositionScale = d3.scaleLinear()
    .domain([30, 85])
    .range([height, 0])
  // var colorScale3 = d3.scaleOrdinal(d3.schemeCategory10);
  var colorScale3 = d3.scaleOrdinal()
    .domain(["White", "All Races", "Black"])
    .range([
      "#2ca02c", //grean
      "#000000" ,
      "#ff7f0e" //orange
    ]);

  d3.queue()
    .defer(d3.csv, "NCHS_-_Death_rates_and_life_expectancy_race.csv", function(d) {
      return d;
    })
    .await(ready);


  function ready(error, datapoints) {

    svg.selectAll(".AVGcircle")
      .data(datapoints)
      .enter().append("circle")
      .attr("circle", "AVGcircle")
      .attr("r", 1)
      .attr("cx", function(d) {
        // console.log(xPositionScale(d["Income"]))
        return xPositionScale(d["Year"])//+xPosition_adjustment
      })
      .attr("cy", function(d) {
        // console.log(yPositionScale(d["Data_Value"]))
        return yPositionScale(d["Average Life Expectancy (Years)"])
      })
      .attr("fill", function(d){
        return colorScale3(d['Race']);
      })
    var datapoints_nested = d3.nest()
      .key(function(d) {return d.Race;})
      .entries(datapoints)
    // console.log(datapoints_nested);
    var line = d3.line()
      .x(function (d) {
        return xPositionScale(d['Year'])
      })
      .y(function (d) {
        return yPositionScale(d['Average Life Expectancy (Years)'])
      })
    svg.selectAll("path")
      .data(datapoints_nested)
      .enter().append("path")
      .attr("d", function(d) { 
        return line(d.values); 
      })
      .style("fill", "none")
      .style("stroke-width", 1)
      .style("stroke", function(d){ return colorScale3(d['key']); })
    var Race_text = svg.append("g")
      .selectAll("text").data(datapoints_nested).enter().append("text")
      .text(function( d, i ){ return d["key"].toUpperCase(); })
      .attr("x", function(d) {
        var last_element = d.values[0];
        return 10 + xPositionScale(last_element['Year']);
      })
      .attr("y", function(d){
        var last_element = d.values[0];
        return yPositionScale(last_element['Average Life Expectancy (Years)']);
      })
      .attr("dy", function(d) {
        if(d.key === "All Races") {
          return 15
        }
        return 3
      })
      .attr("class", "cool_text")
      .attr("fill", function(d){
        return colorScale3(d['key']);
      })
    svg.append("line")
      .attr("x1", xPositionScale(1945))
      .attr("x2", xPositionScale(1945))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "black")


    var yAxis = d3.axisLeft(yPositionScale);
    svg.append("g")
      .attr("class", "axis y-axis")
      .call(yAxis);

    var xAxis = d3.axisBottom(xPositionScale)
    svg.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);


  }

})();