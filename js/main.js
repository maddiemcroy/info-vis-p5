var width = 500;
var height= 500;

d3.csv("./data/movies.csv", function(csv) {
  console.log(csv);

  var svg = d3.select("#chart").append('svg')
    .attr('width', width)
    .attr('height', height);

  var grossExtent = d3.extent(csv, function(row) { return row.gross });
  var imdbScoreExtent = d3.extent(csv, function(row) { return row.imdb_score });
  var durationExtent = d3.extent(csv, function(row) { return row.duration });

  var xScale = d3.scaleLinear().domain(durationExtent).range([50, 470]);
  var yScale = d3.scaleLinear().domain(imdbScoreExtent).range([470, 30]);

  var xAxis = d3.axisBottom().scale(xScale);
  var yAxis = d3.axisLeft().scale(yScale);

  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  var points = svg.selectAll("circle")
    .data(csv)
    .enter()
    .append("circle")
    .attr("id",function(d,i) {return i;} )
    .attr("stroke", "black")
    .attr("cx", function(d) {
      if (d.duration != "") {
        return xScale(d.duration);
      } else {
        return -20;
      }
    })
    .attr("cy", function(d) { return yScale(d.imdb_score); })
    .attr("r", 5)
    .on("mouseover", function(d) {
        d3.select(this).attr('fill', "red");
        tooltip.style("opacity", .9)
          .html("<b>" + d.movie_title + "</b> " + d.title_year + "<br/>"
                + d.director_name)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
        d3.select(this).attr('fill', "black");
        tooltip.style("opacity", 0);
    });

  svg.append("g")
		.attr("transform", "translate(0,"+ (width -30)+ ")")
		.call(xAxis)
		.append("text")
		.attr("class", "label")
		.attr("x", width-16)
		.attr("y", -6)
		.style("text-anchor", "end")
		.text("Gross");

  svg
		.append("g")
		.attr("transform", "translate(50, 0)")
		.call(yAxis)
		.append("text")
		.attr("class", "label")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
		.text("IMDB Score");

});
