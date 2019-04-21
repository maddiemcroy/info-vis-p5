var config;

$.ajax({
  async: false,
  dataType: "json",
  url: "https://api.themoviedb.org/3/configuration?api_key=fb3086fa3365a713654919ddf45b9a4b",
  success: function(result) {
    config = result;
  }
});

console.log(config);

var s_width  = 400;
var s_height = 350;

var p_margin = {top: 30, right: 10, bottom: 10, left: 0};
var p_width = 800 - p_margin.left - p_margin.right;
var p_height = 600 - p_margin.top - p_margin.bottom;

var p_x = d3.scalePoint().range([0, p_width]).padding(1),
    p_y = {};

var p_dimensions = null;

var genreFilter = "All";
var timeFilter = {
  min: "1000",
  max: "3000"
};

var line = d3.line(),
    axisLeft = d3.axisLeft();

d3.csv("./data/movies.csv", function(csv) {
  console.log(csv);

  var p_background,
      p_foreground;

  var s_svg = d3.select("#chart").append('svg')
    .attr('width', s_width)
    .attr('height', s_height);

  // var timeSvg = d3.select("timeScale").append('svg')
  //   .attr('width', width)
  //   .attr('height', 100);

  var p_svg = d3.select("#parallel").append("svg")
    .attr("width", p_width + p_margin.left + p_margin.right)
    .attr("height", p_height + p_margin.top + p_margin.bottom)
    .append("g")
    .attr("transform", "translate(" + p_margin.left + "," + p_margin.top + ")");


  // for (row :)
  var genreSet = new Set();
  csv.forEach((row) => {
    row.genreArray = row.genres.split("|")
    row.genreArray.forEach((genre) => {
      genreSet.add(genre);
    })
  })

  var buttonRow = d3.select("#genre-buttons")
  var gi = 0;
  genreSet.forEach((genre) => {
    if (gi++ < 8) {
      buttonRow.append("label")
        .attr("class", "btn btn-secondary")
        .html('<input type="radio" name="options" id="option2" value="' + genre + '" autocomplete="off"> ' + genre)
    }
  })

  // console.log(genreSet)

  var grossExtent = d3.extent(csv, function(row) { return +row.gross });
  var imdbScoreExtent = d3.extent(csv, function(row) { return +row.imdb_score });
  var durationExtent = d3.extent(csv, function(row) { return +row.duration });
  var timeExtent = d3.extent(csv, function(row) { return +row.title_year });

  // console.log(durationExtent);
  // console.log(timeExtent);

  var xScale = d3.scaleLinear().domain([0, 220]).range([50, s_width-30]);
  var yScale = d3.scaleLinear().domain(imdbScoreExtent).range([s_height-30, 30]);
  var timeScale = d3.scaleLinear().domain(timeExtent).range([0, s_width]);

  var xAxis = d3.axisBottom().scale(xScale);
  var yAxis = d3.axisLeft().scale(yScale);

  var valid_keys = ["imdb_score", "duration", "cast_total_facebook_likes", "num_voted_users", "facenumber_in_poster"]
  p_x.domain(p_dimensions = d3.keys(csv[0]).filter(function(d) {
    return d != "name" && valid_keys.includes(d) && (p_y[d] = d3.scaleLinear()
        .domain(d3.extent(csv, function(p) { return +p[d]; }))
        .range([p_height, 0]));
  }));

  // p_background = p_svg.append("g")
  //     .attr("class", "background")
  //     .selectAll("path")
  //     .data(csv)
  //     .enter().append("path")
  //     .attr("d", path)
  //     .classed("pc-entry", true);

  // Add blue foreground lines for focus.
  p_foreground = p_svg.append("g")
      .attr("class", "foreground")
      .selectAll("path")
      .data(csv)
      .enter().append("path")
      .classed("pc-entry", true)
      .attr("d", path)
      .classed("fg-pc-entry", true);

  // Add a group element for each dimension.
  const p_g = p_svg.selectAll(".dimension")
      .data(p_dimensions)
      .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + p_x(d) + ")"; });

  p_g.append("g")
      .attr("class", "axis")
      .each(function(d) { d3.select(this).call(axisLeft.scale(p_y[d])); })
      .append("text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(function(d) { return d; });

  p_g.append("g")
      .attr("class", "brush")
      .each(function(d) {
          d3.select(this).call(p_y[d].brush = d3.brushY()
            .extent([[-10,0], [10,p_height]])
            .on("brush", brush)
            .on("end", brush)
            )
        })
    .selectAll("rect")
      .attr("x", -8)
      .attr("width", 16);

  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  var points = s_svg.selectAll("circle")
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
          .html("<b>" + d.movie_title + "</b> " + d.title_year
                + "<br/>" + d.director_name
                + "<br/>" + d.duration)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
        d3.select(this).attr('fill', "black");
        tooltip.style("opacity", 0);
    })
    .on("click", function(d) {
      $("#title").fadeOut(400, function() {
        d3.select("#title").html(d.movie_title);
        $("#title").fadeIn();
      });
      $("#director").fadeOut(400, function() {
        d3.select("#director").html(d.director_name);
        $("#director").fadeIn();
      });
      $("#details-poster-img").fadeOut(400, function() {
        d3.select("#details-poster-img").attr("src", getPoster(d.movie_title));
        $("#details-poster-img").fadeIn();
      });
    });



  s_svg.append("g")
		.attr("transform", "translate(0,"+ (s_height-30)+ ")")
		.call(xAxis)
		.append("text")
		.attr("class", "label")
		.attr("x", s_width-16)
		.attr("y", -6)
		.style("text-anchor", "end")
		.text("Gross");

  s_svg.append("g")
		.attr("transform", "translate(50, 0)")
		.call(yAxis)
		.append("text")
		.attr("class", "label")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
		.text("IMDB Score");

  function path(d) {
      return line(p_dimensions.map(function(p) { return [p_x(p), p_y[p](d[p])]; }));
  }

  var activeBrushes = [];

  function brush() {
    // var actives = [];
    activeBrushes = [];
    p_svg.selectAll(".brush")
      .filter(function(d) {
            p_y[d].brushSelectionValue = d3.brushSelection(this);
            return d3.brushSelection(this);
      })
      .each(function(d) {
          // Get extents of brush along each active selection axis (the Y axes)
            activeBrushes.push({
                dimension: d,
                extent: d3.brushSelection(this).map(p_y[d].invert)
            });
      });

    // var selected = [];
    // Update foreground to only display selected values
    // p_foreground.style("display", function(d) {
    //     return actives.every(function(active) {
    //         let result = active.extent[1] <= d[active.dimension] && d[active.dimension] <= active.extent[0];
    //         if(result)selected.push(d);
    //         return result;
    //     }) ? null : "none";
    // });
    updateDisplay();
    // (actives.length>0)?out.text(d3.tsvFormat(selected.slice(0,24))):out.text(d3.tsvFormat(sample_data.slice(0,24)));;
  }

  function updateDisplay() {

    function inFocus(data) {
      // console.log(data.genreArray);
      return (genreFilter == "All" || data.genreArray.includes(genreFilter))
        && activeBrushes.every((active) => {
            let result = active.extent[1] <= data[active.dimension] && data[active.dimension] <= active.extent[0];
            // if(result)selected.push(d);
            return result;
        });
    }

    d3.selectAll("circle")
      .classed("hidden-circle", true)
      .filter(inFocus)
      .classed("hidden-circle", false);

    d3.selectAll(".foreground")
      .selectAll("path")
      .classed("fg-pc-entry", false)
      .filter(inFocus)
      .classed("fg-pc-entry", true);


    // d3.selectAll("circle")
    //   .classed("hidden-circle", true)
    //   .filter((data) => {
    //     return genreFilter == "All" || data.genreArray.includes(genreFilter)
    //   })
    //   .classed("hidden-circle", false);
    //
    // d3.selectAll(".foreground")
    //   .selectAll("path")
    //   .classed("fg-pc-entry", false)
    //   .filter((data) => {
    //     return activeBrushes.every((active) => {
    //         let result = active.extent[1] <= data[active.dimension] && data[active.dimension] <= active.extent[0];
    //         // if(result)selected.push(d);
    //         return result;
    //     });
    //   })
    //   .classed("fg-pc-entry", true);
  }

  $("#genre-buttons").click((event) => {
    // console.log(event.target.children[0].value)
    var radioValue = event.target.children[0].value; //$("input[name='options']:checked").val();
    genreFilter = radioValue;
    updateDisplay();
  });

});



function getPoster(title) {
  var url;
  $.ajax({
    async: false,
    dataType: "json",
    url: "https://api.themoviedb.org/3/search/movie?api_key=fb3086fa3365a713654919ddf45b9a4b&language=en-US&query=" + title + "&page=1&include_adult=false",
    success: function(result) {
      console.log(config.images.base_url);
      console.log(config.images.poster_sizes[2]);
      url = config.images.base_url + config.images.poster_sizes[2] + result.results[0].poster_path;
    }
  });
  return url;
}
