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

var width  = 400;
var height = 350;

var genreFilter = "All";
var timeFilter = {
  min: "1000",
  max: "3000"
};

d3.csv("./data/movies.csv", function(csv) {
  console.log(csv);

  var svg = d3.select("#chart").append('svg')
    .attr('width', width)
    .attr('height', height);

  var timeSvg = d3.select("timeScale").append('svg')
    .attr('width', width)
    .attr('height', 100);

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

  var xScale = d3.scaleLinear().domain([0, 220]).range([50, width-30]);
  var yScale = d3.scaleLinear().domain(imdbScoreExtent).range([height-30, 30]);
  var timeScale = d3.scaleLinear().domain(timeExtent).range([0, width]);

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



  svg.append("g")
		.attr("transform", "translate(0,"+ (height-30)+ ")")
		.call(xAxis)
		.append("text")
		.attr("class", "label")
		.attr("x", width-16)
		.attr("y", -6)
		.style("text-anchor", "end")
		.text("Gross");

  svg.append("g")
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

$("#genre-buttons").click((event) => {
  // console.log(event.target.children[0].value)
  var radioValue = event.target.children[0].value; //$("input[name='options']:checked").val();
  if (radioValue == "All") {
    console.log("its all")
    d3.selectAll("circle").classed("hidden-circle", false);
    return
  }
  // console.log("radio value " + radioValue.toString())
  d3.selectAll("circle")
    .classed("hidden-circle", true)
    .filter((data) => {
      // console.log(data.genreArray.includes(radioValue))
      return data.genreArray.includes(radioValue)
    }).classed("hidden-circle", false)
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

function parallel_coordinates() {
  d3.csv("./data/movies.csv", function(csv) {
    var margin = {top: 30, right: 10, bottom: 10, left: 0};
    var width = 800 - margin.left - margin.right;
    var height = 600 - margin.top - margin.bottom;

    var x = d3.scalePoint().range([0, width]).padding(1),
        y = {};

    var line = d3.line(),
        axis = d3.axisLeft(),
        background,
        foreground;

    var dimensions = null;

    const svg = d3.select("#parallel").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g");
    const svg_adjusted = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var out = d3.select("#parallel-out")
    // out.text(d3.tsvFormat(sample_data.slice(0,24)));
    var sample_data = csv;

    // Extract the list of dimensions and create a scale for each.
    var valid_keys = ["imdb_score", "duration", "cast_total_facebook_likes", "num_voted_users", "facenumber_in_poster"]
    x.domain(dimensions = d3.keys(sample_data[0]).filter(function(d) {
      return d != "name" && valid_keys.includes(d) && (y[d] = d3.scaleLinear()
          .domain(d3.extent(sample_data, function(p) { return +p[d]; }))
          .range([height, 0]));
    }));

    // Add grey background lines for context.
    background = svg_adjusted.append("g")
        .attr("class", "background")
      .selectAll("path")
        .data(sample_data)
      .enter().append("path")
        .attr("d", path)
        .classed("pc-entry", true);

    // Add blue foreground lines for focus.
    foreground = svg_adjusted.append("g")
        .attr("class", "foreground")
      .selectAll("path")
        .data(sample_data)
      .enter().append("path")
        .attr("d", path)
        .classed("fg-pc-entry", true);

    // Add a group element for each dimension.
    const g = svg_adjusted.selectAll(".dimension")
        .data(dimensions)
      .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; });

    // Add an axis and title.
    g.append("g")
        .attr("class", "axis")
        .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
      .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function(d) { return d; });

    // Add and store a brush for each axis.
    g.append("g")
        .attr("class", "brush")
        .each(function(d) {
            d3.select(this).call(y[d].brush = d3.brushY()
              .extent([[-10,0], [10,height]])
              .on("brush", brush)
              .on("end", brush)
              )
          })
      .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);

    // Returns the path for a given data point.
    function path(d) {
        return line(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
    }

    // Handles a brush event, toggling the display of foreground lines.
    function brush() {
        var actives = [];
        svg.selectAll(".brush")
          .filter(function(d) {
                y[d].brushSelectionValue = d3.brushSelection(this);
                return d3.brushSelection(this);
          })
          .each(function(d) {
              // Get extents of brush along each active selection axis (the Y axes)
                actives.push({
                    dimension: d,
                    extent: d3.brushSelection(this).map(y[d].invert)
                });
          });

        var selected = [];
        // Update foreground to only display selected values
        foreground.style("display", function(d) {
            return actives.every(function(active) {
                let result = active.extent[1] <= d[active.dimension] && d[active.dimension] <= active.extent[0];
                if(result)selected.push(d);
                return result;
            }) ? null : "none";
        });
        // (actives.length>0)?out.text(d3.tsvFormat(selected.slice(0,24))):out.text(d3.tsvFormat(sample_data.slice(0,24)));;

    }
    return svg.node();
  });
}

parallel_coordinates();
