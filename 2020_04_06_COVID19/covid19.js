// ---------- ---------- region ---------- ---------- //
const COUNTRY = "country";
const US_STATE = "US_state";
const GERMAN_STATE = "German_state";

// ---------- ---------- utility functions ---------- ---------- //
function is_unknown(value){
	return (value === null)
		|| ((typeof value === "number") && isNaN(value))
		|| (typeof value === "undefined");
}

format_count = d3.format(",");

function convert_m_d_yy_to_yyyymmdd(m_d_yy){
	let m_d_yy_list = m_d_yy.split("/");
	return (
		10000*(Number(m_d_yy_list[2]) + 2000)
		+ 100*Number(m_d_yy_list[0])
		+     Number(m_d_yy_list[1])
	);
}
function _convert_yyyymmdd_to_date(yyyymmdd){
	// for example, 20200329 into Sun Mar 29 2020 00:00:00 GMT-0400 (Eastern Daylight Time)
	let i = parseInt(yyyymmdd);
	year  = Math.floor(i / 10000);
	month = Math.floor(i % 10000 / 100);
	day   = i % 100;
	return  new Date(year, month - 1, day);
}
function convert_yyyymmdd_to_unix_timestamp(yyyymmdd){
	return _convert_yyyymmdd_to_date(yyyymmdd).getTime();
}
function convert_unix_timestamp_to_yyyymmdd(unix_timestamp){
	let date = new Date(unix_timestamp);
	date_year = date.getFullYear();
	date_month = date.getMonth() + 1;
	date_day = date.getDate();
	return "" + (date_year*10000 + date_month*100 + date_day);
}
function format_unix_timestamp(unix_timestamp){
	return new Date(unix_timestamp)
		.toLocaleDateString(
			"en-US",
			{ year: 'numeric', month: 'short', day: 'numeric' },
		);
}

// ---------- ---------- list of regions ordered by the date of first confirmed case ---------- ---------- //
function fill_region_to_yyyymmdd_of_1st_confirmed_case(region_to_yyyymmdd_to_count_confirmed){
	let region_to_yyyymmdd_of_1st_confirmed_case = {};

	for (let region in region_to_yyyymmdd_to_count_confirmed){
		let yyyymmdd_to_count_confirmed = region_to_yyyymmdd_to_count_confirmed[region];
		
		let yyyymmdd_of_1st_confirmed_case = d3.min(
			Object.keys(yyyymmdd_to_count_confirmed)
			.filter(yyyymmdd => yyyymmdd_to_count_confirmed[yyyymmdd])
		);

		// Some of the data have only 0 values, so date_of_1st_confirmed_case is undefined
		if (yyyymmdd_of_1st_confirmed_case){
			region_to_yyyymmdd_of_1st_confirmed_case[region] = yyyymmdd_of_1st_confirmed_case;
		}
	}

	return region_to_yyyymmdd_of_1st_confirmed_case;
}
function fill_regions_sorted_by_yyyymmdd_of_1st_confirmed_case(region_to_yyyymmdd_of_1st_confirmed_case){
	let regions_sorted_by_yyyymmdd_of_1st_confirmed_case =
		Object.keys(region_to_yyyymmdd_of_1st_confirmed_case)
		.sort(
			(regionA, regionB) => d3.ascending(  // sort by date...
				region_to_yyyymmdd_of_1st_confirmed_case[regionA],
				region_to_yyyymmdd_of_1st_confirmed_case[regionB]
			) || d3.ascending(  // ...then by country name, alphabetically
				regionA,
				regionB
			)
		);

	return regions_sorted_by_yyyymmdd_of_1st_confirmed_case;
}

// ---------- ---------- draw chart ---------- ---------- //
let POPULATION_DENOMINATOR = 5;
let COUNT_DENOMINATOR      = 20;

function sqrt_and_scale_as_radius(count, denominator){
	return Math.sqrt(count) / denominator || 0;  // There's sometimes garbage numbers like -1
}

function _get_count(region_to_yyyymmdd_to_count, region, yyyymmdd){
	if (is_unknown(region_to_yyyymmdd_to_count)){
		return 0;
	}
	let yyyymmdd_to_count = region_to_yyyymmdd_to_count[region] || {};
	return yyyymmdd_to_count[yyyymmdd] || 0;
}
function _is_count_unknown(region_to_yyyymmdd_to_count, region, yyyymmdd){
	return is_unknown(region_to_yyyymmdd_to_count)
		|| is_unknown(region_to_yyyymmdd_to_count[region])
		|| is_unknown(region_to_yyyymmdd_to_count[region][yyyymmdd]);
}

const MAX_REGION_NAME_LENGTH = 7;
function ellipticize(region, i){
	if (region.length > MAX_REGION_NAME_LENGTH) {
		return region.slice(0, MAX_REGION_NAME_LENGTH) + "...";
	}
	else {
		return region;
	}
}

function draw_chart(
	region_to_yyyymmdd_to_count_tested,
	region_to_yyyymmdd_to_count_confirmed,
	region_to_yyyymmdd_to_count_recoveries,
	region_to_yyyymmdd_to_count_deaths,
	region_to_population,
	region_to_yyyymmdd_of_1st_confirmed_case,
	regions_sorted_by_yyyymmdd_of_1st_confirmed_case,
	first_yyyymmdd,
	last_yyyymmdd,
	initial_yyyymmdd,
){
	d3.select("#intro")
	.append("h2")
		.attr("id", "date_value");

	d3.select("#intro")
	.append("p")
		.html("Use the slider below to see the chart for different dates.");

	// ---------- ---------- dimensions ---------- ---------- //
	const margin_left   = 7;
	const margin_right  = 7;
	const margin_top    = 21;
	const margin_bottom = 7;
	const outerbox_width = 1200;
	// skip padding and innerbox

	const slider_width = outerbox_width;
	const slider_height = 60;

	const circle_distance = 90;
	const circles_margin_left   = circle_distance / 2;
	const circles_margin_right  = circle_distance / 2;
	const circles_margin_top    = circle_distance / 2;
	const circles_margin_bottom = circle_distance / 2;

	const circle_col_count = Math.ceil(
		(outerbox_width - circles_margin_left)  // Don't `- circles_margin_right`. It messes up the calculation
		/ circle_distance
	);
	const circle_row_count = Math.ceil(
		regions_sorted_by_yyyymmdd_of_1st_confirmed_case.length
		/ circle_col_count
	);

	const svg_width = margin_left + outerbox_width + margin_right;
	const svg_height = margin_top
		+ slider_height
		+ circles_margin_top
		+ circle_distance * (circle_row_count - 1)
		+ circles_margin_bottom
		+ margin_bottom;

	const dimensions = {
		margin_left,
		margin_right,
		margin_top,
		margin_bottom,
		outerbox_width,

		slider_width,
		slider_height,

		circle_distance,
		circles_margin_left,
		circles_margin_right,
		circles_margin_top,
		circles_margin_bottom,
		circle_col_count,
		circle_row_count,

		svg_width,
		svg_height,
	};

	// ---------- ---------- svg ---------- ---------- //
	const svg = d3.select("#chart")
		.attr("width", dimensions.svg_width)
		.attr("height", dimensions.svg_height);
	;

	// ---------- ---------- circles ---------- ---------- //
	const g_circles = d3.select("#circles")
		.attr(
			"transform",
			"translate("
				+ dimensions.margin_left + ", "
				+ (dimensions.margin_top + dimensions.slider_height)
			+ ")"
		);

	const each_g = g_circles
	.selectAll("g").data(regions_sorted_by_yyyymmdd_of_1st_confirmed_case).enter().append("g")
		.attr("id", (_, i) => `region_${i}`)
		.attr(
			"transform",
			(_, i) => {
				let quotient = Math.floor(i / dimensions.circle_col_count);
				let remainder = i % dimensions.circle_col_count;

				let left = dimensions.circles_margin_left + dimensions.circle_distance * remainder;
				let top = dimensions.circles_margin_top + dimensions.circle_distance * quotient;
				return `translate(${left}, ${top})`;
			}
		)

	// population
	each_g
	.append("circle")
		.classed("population", true)
		.attr(
			"r",
			(region, i) => {
				return sqrt_and_scale_as_radius(
					parseInt(region_to_population[region] || 0),
					COUNT_DENOMINATOR * POPULATION_DENOMINATOR
				);
			}
		)
	;

	// test cases
	each_g
	.append("circle")
		.classed("tested", true)
		.attr(
			"r",
			(region, i) => {
				return sqrt_and_scale_as_radius(
					_get_count(region_to_yyyymmdd_to_count_tested, region, initial_yyyymmdd),
					COUNT_DENOMINATOR
				)
			}
		)
	;

	// confirmed cases
	each_g
	.append("circle")
		.classed("confirmed", true)
		.attr(
			"r",
			(region, i) => {
				return sqrt_and_scale_as_radius(
					_get_count(region_to_yyyymmdd_to_count_confirmed, region, initial_yyyymmdd),
					COUNT_DENOMINATOR,
				);
			}
		)
	;

	// recoveries + deaths
	each_g
	.append("circle")
		.classed("recoveries", true)
		.attr(
			"r",
			(region, i) => {
				return sqrt_and_scale_as_radius(
					_get_count(region_to_yyyymmdd_to_count_recoveries, region, initial_yyyymmdd)
					+ _get_count(region_to_yyyymmdd_to_count_deaths, region, initial_yyyymmdd),
					COUNT_DENOMINATOR
				);
			}
		)
	;

	// deaths
	each_g
	.append("circle")
		.classed("deaths", true)
		.attr(
			"r",
			(region, i) => {
				return sqrt_and_scale_as_radius(
					_get_count(region_to_yyyymmdd_to_count_deaths, region, initial_yyyymmdd),
					COUNT_DENOMINATOR
				);
			}
		)
	;

	// region name text
	each_g
	.append("text")
		.classed("region_name", true)
		.attr("x", 5)
		// .text((region, i) => region)
		.text(ellipticize)
	;

	// ---------- ---------- invisible dummy areas + tooltip ---------- ---------- //
	var tooltip_div = d3.select("body").append("div")
		.classed("tooltip", true)
		.style("opacity", 0);
	function write_tooltip_text(region, yyyymmdd){
		return (
			region
			+ "<br/><span class='tooltip_label'>Date of first confirmed case: </span>"
				+ format_unix_timestamp(
					convert_yyyymmdd_to_unix_timestamp(
						region_to_yyyymmdd_of_1st_confirmed_case[region]
					)
				)
			+ "<br/><span class='tooltip_label'>Tested: </span>"
				+ (
					_is_count_unknown(region_to_yyyymmdd_to_count_tested, region, yyyymmdd)
					? "N/A"
					: format_count(
						_get_count(region_to_yyyymmdd_to_count_tested, region, yyyymmdd)
					)
				)
			+ "<br/><span class='tooltip_label'>Confirmed: </span>"
				+ (
					_is_count_unknown(region_to_yyyymmdd_to_count_confirmed, region, yyyymmdd)
					? "N/A"
					: format_count(
						_get_count(region_to_yyyymmdd_to_count_confirmed, region, yyyymmdd)
					)
				)
			+ " (<span class='tooltip_label'>Active: </span>"
				+ (
					(
						_is_count_unknown(region_to_yyyymmdd_to_count_confirmed, region, yyyymmdd)
						|| _is_count_unknown(region_to_yyyymmdd_to_count_recoveries, region, yyyymmdd)
						|| _is_count_unknown(region_to_yyyymmdd_to_count_deaths, region, yyyymmdd)
					)
					? "N/A"
					: format_count(
						_get_count(region_to_yyyymmdd_to_count_confirmed, region, yyyymmdd)
						- _get_count(region_to_yyyymmdd_to_count_recoveries, region, yyyymmdd)
						- _get_count(region_to_yyyymmdd_to_count_deaths, region, yyyymmdd)
					)
				)
			+ ")"
			+ "<br/><span class='tooltip_label'>Recoveries: </span> "
				+ (
					_is_count_unknown(region_to_yyyymmdd_to_count_recoveries, region, yyyymmdd)
					? "N/A"
					: format_count(
						_get_count(region_to_yyyymmdd_to_count_recoveries, region, yyyymmdd)
					)
				)
			+ "<br/><span class='tooltip_label'>Deaths: </span>"
				+ (
					_is_count_unknown(region_to_yyyymmdd_to_count_deaths, region, yyyymmdd)
					? "N/A"
					: format_count(
						_get_count(region_to_yyyymmdd_to_count_deaths, region, yyyymmdd)
					)
				)
		);
	}

	const g_dummies = d3.select("#dummies")
		.attr(
			"transform",
			"translate("
				+ dimensions.margin_left + ", "
				+ (dimensions.margin_top + dimensions.slider_height)
			+ ")",
		);
	g_dummies
	.selectAll("rect").data(regions_sorted_by_yyyymmdd_of_1st_confirmed_case).enter().append("rect")
		.attr(
			"transform",
			(_, i) => {
				let quotient = Math.floor(i / dimensions.circle_col_count);
				let remainder = i % dimensions.circle_col_count;

				let left = dimensions.circles_margin_left + dimensions.circle_distance * remainder;
				let top = dimensions.circles_margin_top + dimensions.circle_distance * quotient;
				return `translate(${left}, ${top})`;
			}
		)
		.attr("opacity", 0)
		.attr("x", - dimensions.circle_distance / 2)
		.attr("y", - dimensions.circle_distance / 2)
		.attr("width", dimensions.circle_distance)
		.attr("height", dimensions.circle_distance)
	.on("mouseover", function(region, i){
		let g_region_i = d3.select(`g#region_${i}`);

		// display full region name
		g_region_i.select("text.region_name")
			.classed("selected", true)
			.text(region);

		console.log();
		// population circle
		g_region_i.select("circle.population")
			.classed("selected", true);

		// tooltip
		tooltip_div
			.transition().duration(500)
			.style("opacity", 0.8);

		tooltip_div
			.html(write_tooltip_text(region, initial_yyyymmdd))
			.style("left", (d3.event.pageX) + "px")
			.style("top", (d3.event.pageY) + "px");
	})
	.on("mouseout", function(region, i){
		let g_region_i = d3.select(`g#region_${i}`);

		// ellipticize region name
		g_region_i.select("text.region_name")
			.classed("selected", false)
			.text(ellipticize(region));

		// population circle
		g_region_i.select("circle.population")
			.classed("selected", false);

		// tooltip
		tooltip_div
			.classed("selected", false)
			.transition().duration(500)
			.style("opacity", 0);;
	})

	// ---------- ---------- slider ---------- ---------- //
	const g_slider = d3.select("#slider")
		.attr("transform", `translate(${dimensions.margin_left}, ${dimensions.margin_top})`);

	//Slider Properties
	const minValue = convert_yyyymmdd_to_unix_timestamp(first_yyyymmdd);
	const maxValue = convert_yyyymmdd_to_unix_timestamp(last_yyyymmdd);
	const initialValue = maxValue;
	const stepSize = 86400000;  // 24 h/d * 60 m/h * 60 s/m * 1000 ms/s  // Add stepSize
	const color = "#51cbcb"; // green #51cb3f
	const emptyColor = "#ececec"; // gray
	const thumbColor = "white";
	const lineWidth = 6;
	const thumbSize = 6;

	let value;
	let valueNormalized = (initialValue-minValue)/(maxValue-minValue); // value normalized between 0-1
	let valueScaled = valueNormalized * dimensions.slider_width;
	let stepSizeScaled = stepSize / (maxValue-minValue) * dimensions.slider_width;  // Add stepSize

	// Display the date
	document.getElementById("date_value").innerHTML = format_unix_timestamp(initialValue);

	//Line to represent the current value
	let valueLine = g_slider.append("line")
		.attr("x1", 0)
		.attr("x2", dimensions.slider_width * valueNormalized)
		.attr("y1", dimensions.margin_top)
		.attr("y2", dimensions.margin_top)
		.style("stroke", color)
		.style("stroke-linecap", "round")
		.style("stroke-width", lineWidth);

	//Line to show the remaining value
	let emptyLine = g_slider.append("line")
		.attr("x1", dimensions.slider_width * valueNormalized)
		.attr("x2", dimensions.slider_width)
		.attr("y1", dimensions.margin_top)
		.attr("y2", dimensions.margin_top)
		.style("stroke", emptyColor)
		.style("stroke-linecap", "round")
		.style("stroke-width", lineWidth);

	// "ticks"
	const num_of_days = Math.ceil((maxValue - minValue)/stepSize) + 1;
	const ticks = g_slider
	.selectAll("circle").data(new Array(num_of_days)).enter().append("circle")
		.attr("fill", "white")
		.attr("r", 1.5)
		.attr("cx", (d, i) => i * stepSizeScaled)
		.attr("cy", dimensions.margin_top);

	//Draggable circle to represent the current value
	let valueCircle = g_slider.append("circle")
		.attr("cx", dimensions.slider_width * valueNormalized)
		.attr("cy", dimensions.margin_top)
		.attr("r", thumbSize)
		.style("stroke", "black")
		.style("stroke-width", 1)
		.style("fill", thumbColor)
		.call(d3.drag().on("drag", dragEnded));

	function dragEnded() {
		valueScaled = d3.event.x;

		// Add stepSize
		let floored = Math.floor(valueScaled / stepSizeScaled) * stepSizeScaled;
		let remainder = valueScaled % stepSizeScaled;
		if(remainder){
			if(remainder < stepSizeScaled / 2){
				valueScaled = floored;
			}
			else{
				valueScaled = floored + stepSizeScaled;
			}
		}

		if (valueScaled < 0)
			valueScaled = 0;
		else if (valueScaled > dimensions.slider_width)
			valueScaled = dimensions.slider_width;

		valueNormalized = valueScaled / dimensions.slider_width;
		value = valueNormalized*(maxValue-minValue)+minValue;
		let value_as_yyyymmdd = convert_unix_timestamp_to_yyyymmdd(value);
		valueCircle.attr("cx", valueScaled);
		valueLine.attr("x2", dimensions.slider_width * valueNormalized);
		emptyLine.attr("x1", dimensions.slider_width * valueNormalized);

		d3.event.sourceEvent.stopPropagation();

		// Display the date
		document.getElementById("date_value").innerHTML = format_unix_timestamp(value);

		// test cases
		each_g
		.selectAll("circle.tested")
			.attr(
				"r",
				(region, i) => {
					return sqrt_and_scale_as_radius(
						_get_count(region_to_yyyymmdd_to_count_tested, region, value_as_yyyymmdd),
						COUNT_DENOMINATOR
					);
				}
			)
		;

		// confirmed cases
		each_g
		.selectAll("circle.confirmed")
			.attr(
				"r",
				(region, i) => {
					return sqrt_and_scale_as_radius(
						_get_count(region_to_yyyymmdd_to_count_confirmed, region, value_as_yyyymmdd),
						COUNT_DENOMINATOR
					);
				}
			)
		;

		// recoveries + deaths
		each_g
		.selectAll("circle.recoveries")
			.attr(
				"r",
				(region, i) => {
					return sqrt_and_scale_as_radius(
						_get_count(region_to_yyyymmdd_to_count_recoveries, region, value_as_yyyymmdd)
						+ _get_count(region_to_yyyymmdd_to_count_deaths, region, value_as_yyyymmdd),
						COUNT_DENOMINATOR
					);
				}
			)
		;

		// deaths
		each_g
		.selectAll("circle.deaths")
			.attr(
				"r",
				(region, i) => {
					return sqrt_and_scale_as_radius(
						_get_count(region_to_yyyymmdd_to_count_deaths, region, value_as_yyyymmdd),
						COUNT_DENOMINATOR
					);
				}
			)
		;

		// invisible dummy areas + tooltip
		g_dummies
		.selectAll("rect")
		.on("mouseover", function(region, i){
			let g_region_i = d3.select(`g#region_${i}`);

			// display full region name
			g_region_i.select("text.region_name")
				.classed("selected", true)
				.text(region);

			// population circle
			g_region_i.select("circle.population")
				.classed("selected", true);

			// tooltip
			tooltip_div
				.transition().duration(500)
				.style("opacity", .8);
			tooltip_div
				.html(write_tooltip_text(region, value_as_yyyymmdd))
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY) + "px");
		})
	}
}

// ---------- ---------- write the intro, analysis, design decisions ---------- ---------- //
function write_intro(
	has_tested,
	has_confirmed,
	has_recoveries,
	has_deaths,
	has_population,
	region,
	regions,
){
	let legend = "";
	if (has_tested){
		legend += '<li>Each <span class="tested">gray</span> area represents the number of tests.</li>';
	}
	if (has_confirmed){
		legend += '<li>Each <span class="confirmed">yellow</span> area represents the number of active confirmed infection cases, not yet recovered or dead.</li>';
	}
	if (has_recoveries){
		legend += '<li>Each <span class="recoveries">green</span> area represents the number of recoveries.</li>';
	}
	if (has_deaths){
		legend += '<li>Each <span class="deaths">red</span> area represents the number of deaths.</li>';
	};
	if (has_population){
		legend += '<li>Each <span class="population">blue</span> "cloud" area, visible when you hover over, represents the population (Because the population is usually far larger than the confirmed cases, for viewing convenience, this area was colored with a gradient, with the result that only 20% of the radius has color).</li>';
	};

	d3.select("#intro")
	.append("ul")
		.html(legend);

	d3.select("#intro")
	.append("ul")
		.html("<li>The " + regions + "' circles are ordered by date of their first confirmed case.</li>");
}

function write_analysis(
	has_tested,
	has_confirmed,
	has_recoveries,
	has_deaths,
	has_population,
	region,
	regions,
){
	d3.select("#write_up")
	.append("h2")
		.html("Analysis");

	if (has_confirmed){
		d3.select("#write_up")
		.append("p")
			.html(
				'Just to state the obvious, <em>the number of confirmed infected cases (the <span class="confirmed">yellow</span> circles) is not the same as the actual number of infected cases</em>. For these numbers to be the same, every potentially sick person needs to seek testing, and everyone who seeks testing needs to be granted a test. This is not the case in many parts of the world, including the U.S.'
			);
	}

	if (has_tested && region === US_STATE){
		d3.select("#write_up")
		.append("p")
			.html(
				'Note that the ' + regions + ' that have more testing also tend to have more confirmed cases. These ' + regions + ' have been vigorously testing people and confirming as many infected people as possible.'
			);
	}

	if (has_confirmed){
		let analysis = 'Moving the slider from the past to the present, we clearly see the explosion of confirmed cases (<span class="confirmed">yellow</span> circles). ';

		switch (region) {
			case COUNTRY:
				analysis += 'In the last week of February, starting from around Feb 21, there starts to be some recognition that the virus had spread widely outside of China. ';
				break;
			case US_STATE:
				analysis += 'Around Mar 15 there starts to be some recognition that the virus had spread widely in the U.S. ';
				break;
			case GERMAN_STATE:
				// https://www.cnn.com/2020/03/24/opinions/germany-low-death-rate-for-coronavirus-sepkowitz/index.html
				analysis += 'Despite <a target="_blank" href="https://www.theguardian.com/world/2020/mar/22/germany-low-coronavirus-mortality-rate-puzzles-experts">early and widespread testing</a>, Germany sees an accelerated increase of confirmed cases starting from around Mar 12. ';
				break;
			default:
				break;
		}

		switch (region) {
			case COUNTRY:
			case US_STATE:
				analysis += 'From there, the explosive increase of confirmed cases can be attributed'
					+'<ul>'
						+'<li>partly to the exponential spread of the virus itself, and</li>'
						+'<li>partly to belated testing that revealed there were far more undetected cases than previously thought.</li>'
					+'</ul>';
				break;
			case GERMAN_STATE:
			default:
				break;
		}

		d3.select("#write_up")
		.append("p")
			.html(analysis);
	}

	if (has_confirmed && has_deaths){
		let confirmed_and_deaths = ""

		switch (region) {
			case COUNTRY:
			case US_STATE:
				confirmed_and_deaths += 'A higher death rate among the confirmed infected (the <span class="deaths">red</span> circle takes up more of the <span class="confirmed">yellow</span> circle) likely means that'
				+'<ul>'
					+'<li>tests to confirm infection are being administered sparingly'
						+'<br/>(the <span class="confirmed">yellow</span> circle is smaller than it would be if there were high test-seeking and high test availability),</li>'
					+'<li>by the time infections are confirmed, it is often already too late'
						+'<br/>(the <span class="confirmed">yellow</span> circle approaches the <span class="deaths">red</span> circle), and/or</li>'
					+'<li>the health care system is overwhelmed'
						+'<br/>(the <span class="deaths">red</span> circle is larger than it would be if hospitals were not at full capacity).</li>'
				+'</ul>'
		}

		d3.select("#write_up")
		.append("p")
			.html(confirmed_and_deaths)
	}

	if (has_deaths){
		d3.select("#write_up")
		.append("p")
			.html(
				'There is some uncertainty regarding the death counts (the <span class="deaths">red</span> circles). For example, in the absence of testing, a COVID-19-related pneumonia death <a target="_blank" href="https://www.cnn.com/2020/04/06/health/us-coronavirus-death-count-cdc-explainer/index.html">may only be classified as a pneumonia death</a>.'
			);
	}

	if (has_recoveries && has_deaths){
		analysis = '';
		if (region === US_STATE){
			analysis += 'For now (Apr 6), it is hard to talk about the mortality rate, as states are still in the process of testing and finding those with the virus. Also, since Mar 27, recovery data (the <span class="recoveries">green</span> circles) have also been added into the dataset for states with major outbreaks.'
		}
		else if (region === COUNTRY){
			analysis += 'It might be too early to say much about recovery rates. This is just to note that, as of Mar 28, it appears that'
					+'<ul>'
						+'<li>countries that developed test kits early, such as South Korea and Germany, have recovery numbers that far outstrip the number of deaths'
							+'<br/>(a thick <span class="recoveries">green</span> ring around the <span class="deaths">red</span> circle),</li>'
						+'<li>while those that experienced delays in testing have recovery numbers that are comparable to or lagging behind the number of deaths'
							+'<br/>(a thin <span class="recoveries">green</span> ring around the <span class="deaths">red</span> circle).</li>'
					+'</ul>'
		}
		d3.select("#write_up")
		.append("p")
			.html(analysis);
	}
	else if (has_confirmed && has_deaths){
		analysis = '';
		if (region === GERMAN_STATE){
			analysis += 'For now (Apr 10), it is hard to talk about the mortality rate, as Germany is still in the process of testing and finding those with the virus. However, if we compare Germany with <a target="_blank" href="by_country.html">other European countries</a>, such as France, Italy, and Spain, where the the number of confirmed cases are comparable, the number of deaths is relatively low, which could be sign that Germany is dealing pretty well against the virus.'
		};	
		d3.select("#write_up")
		.append("p")
			.html(analysis);
	}

	if (has_recoveries){
		d3.select("#write_up")
		.append("p")
			.html(
				'There is some uncertainty regarding the recovery counts (the <span class="recoveries">green</span> circles) as well, as there is some evidence of <a target="_blank" href="https://www.scmp.com/news/china/society/article/3076989/coronavirus-10pc-recovered-patients-test-positive-later-say">reinfection</a>.'
			);
	};
}

function write_design_decisions(
	has_tested,
	has_population,
	region,
	regions,
){
	d3.select("#write_up")
	.append("h2")
		.html("Design Decisions");

	d3.select("#write_up")
	.append("p")
		.html(
			"I <strong>didn't plot the data on a map</strong>, because location and distance does not appear to be very significant for this virus. There is no discernible geographical trend. At best, this data on a map is good for looking up numbers for a region you can already locate on a map."
		);
	d3.select("#write_up")
	.append("p")
		.html(
			"(In fact, too much emphasis on geography is dangerous, especially coupled with underreporting: I think early attitudes towards the virus as an epidemic centered only in Asia might have contributed to complacency on the part of Europe and the U.S., and therefore to its spread in those areas, largely undetected and unmitigated until March.)"
		);

	let breakdown = (region === COUNTRY)
		? "I show data <strong>broken down by country</strong>, because for the most part, health-care policy and disease response are implemented by country."
		: (region === US_STATE)
		? "I show data <strong>broken down by state</strong>, because in the initial absence of a strong federal response, health-care policy and disease response were implemented at the state level."
		: (region === GERMAN_STATE)
		? 'To be perfectly honest, data <strong>broken down by state</strong> would be more meaningful if Germany\'s health-care response differs widely by state (as in <a target="_blank" href="by_state.html">the U.S.</a>). It does not appear to be the case. In fact, this is how the data is expected to look under a coordinated national policy: The states with the earliest cases are hardest hit, while in the rest, the number of cases and the number of deaths are roughly proportional to the population.'
		: "";
	d3.select("#write_up")
	.append("p")
		.html(breakdown);

	d3.select("#write_up")
	.append("p")
		.html(
			"I wanted to show <strong>relative proportions</strong>, not just absolute numbers, <strong>but without numerically calculating proportions</strong>, as that could be misleading, especially for smaller and/or uncertain denominators. Instead, I show the proportions by plotting the absolute numbers as visually comparable areas."
		);

	let normalized = 'There were a few things to normalize for.'
		+ '<ul>';
	if (has_population){
		normalized += '<li>population: A <span class="population">blue</span> "cloud" around each region indicates the population, so the viewer can visually note the proportions.</li>';
	}
	normalized += '<li>days since the first confirmed case: While the '+ regions +' are evenly spaced to help the viewer tell them apart, they are ordered by date of their first confirmed case.</li>'
	normalized += (has_tested)
	? '<li>testing: I showed <span class="tested">gray</span> test number circles around the <span class="confirmed">yellow</span> confirmed cases circles. Each testing number is calculated as the sum of confirmed, tested-and-negative, and tested-and-pending numbers.</li>'
	: "<li>testing: For a more accurate picture, I would love to show another circle for testing, around the confirmed cases circle. Unfortunately, I do not have the resources of a newsroom to unearth data that is not readily available to me.</li>";
	normalized += "</ul>";
	d3.select("#write_up")
	.append("p")
		.html(normalized);

	d3.select("#write_up")
	.append("p")
		.html(
			"In showing these proportions, I also wanted to <strong>emphasize recovery rates as much as mortality</strong>, and also show the number of <strong>active cases</strong> that health-care systems are contending with."
		);
	d3.select("#write_up")
	.append("p")
		.html(
			"By adding a slider, I wanted to make it easy to see <strong>how the numbers changed over time</strong>."
		);
	d3.select("#write_up")
	.append("p")
		.html(
			'These are some excellent guidelines I read up on for visualizing the meaning and uncertainty of this data:'
				+ '<ul>'
					+ '<li><a target="_blank" href="https://medium.com/nightingale/ten-considerations-before-you-create-another-chart-about-covid-19-27d3bd691be8">Ten Considerations Before You Create Another Chart About COVID-19</a> by Amanda Makulec</li>'
					+ '<li><a target="_blank" href="https://blog.datawrapper.de/coronaviruscharts/">17 (or so) responsible live visualizations about the coronavirus, for you to use</a> by Lisa Charlotte Rost (Scroll down to "What we considered while creating these visualizations" and "What you should consider when using these visualizations")</li>'
					+ '<li><a target="_blank" href="https://www.esri.com/arcgis-blog/products/product/mapping/mapping-coronavirus-responsibly/">Mapping coronavirus, responsibly</a> by Kenneth Field</li>'
				+ '</ul>'
		);
}

function write_data_source(
	region,
){
	d3.select("#write_up")
	.append("h2")
		.html("Data Source");

	if (region === COUNTRY){
		d3.select("#write_up")
		.append("p")
			// https://data.humdata.org/dataset/novel-coronavirus-2019-ncov-cases
			.html('The data comes from <a target="_blank" href="https://github.com/CSSEGISandData/COVID-19">https://github.com/CSSEGISandData/COVID-19</a> that powers (or is maintained by the same people that power) the now-famous <a target="_blank" href="https://gisanddata.maps.arcgis.com/apps/opsdashboard/index.html#/bda7594740fd40299423467b48e9ecf6">global cases map</a> by the Center for Systems Science and Engineering (CSSE) at Johns Hopkins University.<span class="footnote_star">*</span> <span class="footnote_star">**</span>');

		d3.select("#write_up")
		.append("p")
			.html('I would like to plot testing numbers as well, but it was not included in the above data source. Unfortunately I am not an entire newsroom. (<a target="_blank" href="https://www.businessinsider.com/coronavirus-testing-covid-19-tests-per-capita-chart-us-behind-2020-3">Business Insider</a> has a snapshot of testing rates.)');

		d3.select("#write_up")
		.append("p")
			.html(
				'Population data are from <a target="_blank" href="https://population.un.org/wpp/Download/Standard/CSV/">the United Nations\' Department of Economic and Social Affairs\' Population Dynamics page.<a>'
				+ '<br/>Population data for Kosovo and Cape Verde are from the <a target="_blank" href="https://en.wikipedia.org/wiki/Kosovo">Wikipedia page for Kosovo<a> and the <a target="_blank" href="https://en.wikipedia.org/wiki/Cape_Verde">Wikipedia page for Cape Verde.<a>'
			);

		d3.select("#write_up")
		.append("p")
			.html('<span class="footnote_star">*</span> It took me some time to make sense of the rows for the U.S. in this data set. There are rows for U.S. states and some U.S. counties (e.g. there is "California" as well as "Napa, CA"). At first glance, the rows for U.S. states appeared to be supersets of U.S. counties, but after some observation, I saw that most U.S. counties\' numbers were zero. A simple sum on all "US" rows gives the total numbers for the U.S.');

		d3.select("#write_up")
		.append("p")
			.html(
				'<span class="footnote_star">**</span> There is some strangeness in the data (as of Mar 25, 2020):'
				+ '<ul>'
					+ '<li>Cape Verde recorded its first confirmed cases on Mar 21, 2020, yet its confirmed case count is 0 in Mar 23, 2020.</li>'
					+ '<li>Same with East Timor, but the data set also includes numbers under its alternate name Timor-Leste.</li>'
					+ '<li>West Bank and Gaza`s confirmed cases for Mar 25, 2020 was -1.</li>'
				+ '</ul>'
				+ 'I decided not to arbitrarily resolve this, instead presenting the data as is.'
			);
	}
	else if (region === US_STATE){
		d3.select("#write_up")
		.append("p")
			.html('The data are from <a target="_blank" href="https://covidtracking.com/api/">The COVID Tracking Project</a> collected from Mar 4, 2020 to Mar 7, 2021. The COVID Tracking Project originally updated its data daily, but it ended its data collection as of March 7, 2021 and the existing API will stop working in May 2021. The COVID Tracking Project&rsquo;s <a target="_blank" href="https://covidtracking.com/data">Most Recent Data (from March 7, 2021)</a> page and <a target="_blank" href="https://covidtracking.com/about-data/faq">FAQ</a> page have detailed information about the provenance and quality of the data. <span class="footnote_star">*</span>');
		d3.select("#write_up")
		.append("p")
			.html('Population data are from <a target="_blank" href="https://worldpopulationreview.com/states/"> World Population Review</a>.');
		d3.select("#write_up")
		.append("p")
			.html('<span class="footnote_star">*</span> The first confirmed case in the U.S. was found on Jan 21, but this dataset starts from Mar 4. Thus I added the dates of the first confirmed cases for the 13 states that already had confirmed cases before Mar 4. These dates are from the <a target="_blank" href="https://en.wikipedia.org/wiki/2020_coronavirus_pandemic_in_the_United_States">Wikipedia page for the 2020 coronavirus pandemic in the United States<a>.');
	}
	else if (region === GERMAN_STATE){
		d3.select("#write_up")
		.append("p")
			// https://github.com/jgehrcke/covid-19-germany-gae
			.html('The data comes from <a target="_blank" href="https://github.com/jgehrcke/covid-19-germany-gae">https://github.com/jgehrcke/covid-19-germany-gae</a>. I used the confirmed cases dataset based on Robert Koch-Institut data, which claims to be more credible than the others. More detailed information is on the linked github repo.<span class="footnote_star">*</span>');
		d3.select("#write_up")
		.append("p")
			.html('Population data are from <a target="_blank" href="https://en.wikipedia.org/wiki/List_of_German_states_by_population">Wikipedia page for List of German states by population</a>.');
		d3.select("#write_up")
		.append("p")
			.html('<span class="footnote_star">*</span> The first confirmed case in Germany was found on Jan 21, but this dataset starts from Mar 4. Thus I added the dates of the first confirmed cases for the states that already had confirmed cases before Mar 4. These dates are from the <a target="_blank" href="https://en.wikipedia.org/wiki/2020_coronavirus_pandemic_in_Germany">Wikipedia page for the 2020 coronavirus pandemic in Germany<a>.');
	}
};

function write_code(){
	d3.select("#write_up")
	.append("h2")
		.html("Code");

	d3.select("#write_up")
	.append("p")
		.html(
			"I made circle charts displaying data by country, by U.S. state/territory, and by Germany states. The formats of the original datasets used in each circle chart are quite different. I converted the datasets into a consistent format so I don't repeat code."
		);

	d3.select("#write_up")
	.append("p")
		.html(
			'The slider was based on <a target="_blank" href="https://github.com/arbelzinger/d3_v4_slider">https://github.com/arbelzinger/d3_v4_slider</a> and on <a target="_blank" href="https://github.com/MasterMaps/d3-slider">https://github.com/MasterMaps/d3-slider</a>.'
			+ '</p>'
			+ '<p>'
				+ 'The tooltip was based on <a target="_blank" href="https://bl.ocks.org/d3noob/a22c42db65eb00d4e369">https://bl.ocks.org/d3noob/a22c42db65eb00d4e369</a>.'
		);
};
