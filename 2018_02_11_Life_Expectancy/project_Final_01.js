(function() {
  var margin = { top: 15, left: 50, right: 120, bottom: 25},
    height = 500 - margin.top - margin.bottom,
    width = 610 - margin.left - margin.right;

  var svg = d3.select("#chart-1")
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

  var colorScale1 = d3.scaleOrdinal(d3.schemeCategory10);
  var colorScale2 = d3.scaleOrdinal()
    .domain(["Female", "Both Sexes", "Male"])
    .range(["#2ca02c", "#000000", "#ff7f0e"]);
  var colorScale3 = d3.scaleOrdinal()
    .domain(["White", "All Races", "Black"])
    .range(["#2ca02c", "#000000", "#ff7f0e"]);

  var barYPositionScale = d3.scaleBand()
    .range([height, 0])
  var barWidthScale = d3.scaleLinear()
    .domain([0, 80])
    .range([0, width])


  d3.queue()
    .defer(d3.csv, "NCHS_-_Death_rates_and_life_expectancy_avg.csv", function(d) {
      return d;
    })
    .defer(d3.csv, "NCHS_-_Death_rates_and_life_expectancy_gender.csv", function(d) {
      return d;
    })
    .defer(d3.csv, "NCHS_-_Death_rates_and_life_expectancy_race.csv", function(d) {
      return d;
    })
    .await(ready);


  function ready(error, datapoints, datapoints_gender, datapoints_race) {

    d3.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };
    d3.selection.prototype.moveToBack = function() {  
        return this.each(function() { 
            var firstChild = this.parentNode.firstChild; 
            if (firstChild) { 
                this.parentNode.insertBefore(this, firstChild); 
            } 
        });
    };

    // tool-tip
    var tool_tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html(function(d) {
        return "<span style='font-weight:bold;'>" + d["Year"] + "</span>: " + d["Average Life Expectancy (Years)"]; 
      })
    // svg.call(tool_tip);
    // var tooltip_div = d3.select("body").append("div") 
    //   .attr("class", "tooltip");

    // Axes
    var yAxis = d3.axisLeft(yPositionScale);
    svg.append("g")
      .attr("class", "axis y-axis")
      .call(yAxis);
    var xAxis = d3.axisBottom(xPositionScale)
    svg.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
    svg.append("line")
      .attr("x1", xPositionScale(1945))
      .attr("x2", xPositionScale(1945))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "black");
    svg.append("line")
      .attr("x1", xPositionScale(1918))
      .attr("x2", xPositionScale(1918))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "black");


    /// Average Frist Grahp - Refrash
    svg.selectAll(".Avgcircle")
      .data(datapoints)
      .enter().append("circle")
      .attr("class", "Avgcircle")
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
        return colorScale2(d['Sex']);
      })
    var datapoints_nested = d3.nest()
      .key(function(d) {return d.Sex;})
      .entries(datapoints)
    var line = d3.line()
      .x(function (d) {
        return xPositionScale(d['Year'])
      })
      .y(function (d) {
        return yPositionScale(d['Average Life Expectancy (Years)'])
      })
    svg.selectAll("Avgpath")
      .data(datapoints_nested)
      .enter().append("path")
      .attr("class", "Avgpath")
      .attr("d", function(d) { 
        return line(d.values); 
      })
      .style("fill", "none")
      .style("stroke-width", 1)
      .style("stroke", function(d){ return colorScale2(d['key']); })
    // var Gender_text = svg.append("g")
    svg.selectAll("Avgtext")
      .data(datapoints_nested)
      .enter().append("text")
      .attr("class", "cool_text Avgtext")
      .text("Average")
      .attr("x", function(d) {
        var last_element = d.values[0];
        return 10 + xPositionScale(last_element['Year']);
      })
      .attr("y", function(d){
        var last_element = d.values[0];
        return yPositionScale(last_element['Average Life Expectancy (Years)']);
      })
      .attr("fill", function(d){
        return colorScale2(d['key']);
      })
    ////



    // Average Frist Grahp - stepin
    d3.select("#Avg").on('stepin', function() {
      // Remove Average graph - refrash
    svg.selectAll("circle.Avgcircle").remove()
    svg.selectAll("path.Avgpath").remove()
    svg.selectAll("text.Avgtext").remove()
      // Remove Gender graph
    svg.selectAll("circle.Gendercircle").remove()
    svg.selectAll("path.Genderpath").remove()
    svg.selectAll("text.Gendertext").remove()
      // Remove Race graph
    svg.selectAll("circle.Racecircle").remove()
    svg.selectAll("path.Racepath").remove()
    svg.selectAll("text.Racetext").remove()

    svg.selectAll(".Avgcircle")
      .data(datapoints)
      .enter().append("circle")
      .attr("class", "Avgcircle")
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
        return colorScale2(d['Sex']);
      })
    var datapoints_nested = d3.nest()
      .key(function(d) {return d.Sex;})
      .entries(datapoints)
    var line = d3.line()
      .x(function (d) {
        return xPositionScale(d['Year'])
      })
      .y(function (d) {
        return yPositionScale(d['Average Life Expectancy (Years)'])
      })
    svg.selectAll("Avgpath")
      .data(datapoints_nested)
      .enter().append("path")
      .attr("class", "Avgpath")
      .attr("d", function(d) { 
        return line(d.values); 
      })
      .style("fill", "none")
      .style("stroke-width", 1)
      .style("stroke", function(d){ return colorScale2(d['key']); })
    // var Gender_text = svg.append("g")
    svg.selectAll("Avgtext")
      .data(datapoints_nested)
      .enter().append("text")
      .attr("class", "cool_text Avgtext")
      .text("Average")
      .attr("x", function(d) {
        var last_element = d.values[0];
        return 10 + xPositionScale(last_element['Year']);
      })
      .attr("y", function(d){
        var last_element = d.values[0];
        return yPositionScale(last_element['Average Life Expectancy (Years)']);
      })
      .attr("fill", function(d){
        return colorScale2(d['key']);
      })
    })




    // Gender Second Grahp
    d3.select("#Gender").on('stepin', function() {
      // Remove Avg graph
    svg.selectAll("circle.Avgcircle").remove()
    svg.selectAll("path.Avgpath").remove()
    svg.selectAll("text.Avgtext").remove()
      // Remove Race graph
    svg.selectAll("circle.Racecircle").remove()
    svg.selectAll("path.Racepath").remove()
    svg.selectAll("text.Racetext").remove()

    svg.selectAll(".Gendercircle")
      .data(datapoints_gender)
      .enter().append("circle")
      .attr("class", "Gendercircle")
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
        return colorScale2(d['Sex']);
      })
    var datapoints_nested = d3.nest()
      .key(function(d) {return d.Sex;})
      .entries(datapoints_gender)
    var line = d3.line()
      .x(function (d) {
        return xPositionScale(d['Year'])
      })
      .y(function (d) {
        return yPositionScale(d['Average Life Expectancy (Years)'])
      })
    svg.selectAll("Genderpath")
      .data(datapoints_nested)
      .enter().append("path")
      .attr("class", "Genderpath")
      .attr("d", function(d) { 
        return line(d.values); 
      })
      .style("fill", "none")
      .style("stroke-width", 1)
      .style("stroke", function(d){ return colorScale2(d['key']); })
    // var Gender_text = svg.append("g")
    svg.selectAll("Gendertext")
      .data(datapoints_nested)
      .enter().append("text")
      .attr("class", "cool_text Gendertext")
      .text(function( d, i ){ return d["key"]; })
      .attr("x", function(d) {
        var last_element = d.values[0];
        return 10 + xPositionScale(last_element['Year']);
      })
      .attr("y", function(d){
        var last_element = d.values[0];
        return yPositionScale(last_element['Average Life Expectancy (Years)']);
      })
      .attr("fill", function(d){
        return colorScale2(d['key']);
      })
    })


    // console.log("tool_tip.show");
    // console.log(tool_tip.show);

    // Race Third Grahp
    d3.select("#Race").on('stepin', function() {
      // Remove Avg graph
    svg.selectAll("circle.Avgcircle").remove()
    svg.selectAll("path.Avgpath").remove()
    svg.selectAll("text.Avgtext").remove()
      // Remove Gender grpah
    svg.selectAll("circle.Gendercircle").remove()
    svg.selectAll("path.Genderpath").remove()
    svg.selectAll("text.Gendertext").remove()
    // svg.call(tool_tip);
    svg.selectAll(".Racecircle")
      .data(datapoints_race)
      .enter().append("circle")
      .attr("class", "Racecircle")
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
      //

      // .on('mouseover', function(d){
      //   d3.select(this)
      //     .attr("r", 4)
      //     .attr("opacity", 0.7)
      //     .moveToFront();
      //   console.log("<span style='color:gray;font-weight:bold;'>Year :</span> " + d["Year"]
      //       + "<br/>"
      //       + "<br/>:</span> " + d["Average Life Expectancy (Years)"]);
      //   tooltip_div
      //     .classed("selected", true)
      //     .html(
      //            "<span style='color:gray;font-weight:bold;'>Name:</span> " + d["Year"]
      //       + "<br/>"
      //       + "<br/>:</span> " + d["Average Life Expectancy (Years)"]
      //     )
      //     .style("left", (d3.event.pageX) + "px")
      //     .style("top", (d3.event.pageY) + "px");
      //   // tool_tip.show(d);
      // })
      // .on('mouseout', function(d){
      //   d3.select(this)
      //     .attr("r", 1)
      //   // tool_tip.hide(d);
      //   tooltip_div
      //     .classed("selected", false);              
      //   ;
      // })
      //
      // .on('mouseover', function(d){
      //   tool_tip.show(d);
      //   d3.select(this)
      //     .attr("r", 6)
      // })
      // .on('mouseout', function(d){
      //   tool_tip.hide(d)
      //   d3.select(this)
      //     .attr("r", 1)
      // });
    var datapoints_nested = d3.nest()
      .key(function(d) {return d.Race;})
      .entries(datapoints_race)
    var line = d3.line()
      .x(function (d) {
        return xPositionScale(d['Year'])
      })
      .y(function (d) {
        return yPositionScale(d['Average Life Expectancy (Years)'])
      })
    svg.selectAll("Racepath")
      .data(datapoints_nested)
      .enter().append("path")
      .attr("class", "Racepath")
      .attr("d", function(d) { 
        return line(d.values); 
      })
      .style("fill", "none")
      .style("stroke-width", 1)
      .style("stroke", function(d){ return colorScale3(d['key']); })
    svg.selectAll("Racetext")
      .data(datapoints_nested)
      .enter().append("text")
      .attr("class", "cool_text Racetext")
      .text(function( d, i ){ return d["key"]; })
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
      .attr("fill", function(d){
        return colorScale3(d['key']);
      })
    })



  }

})();