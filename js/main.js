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

var s_width  = 600;
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

  // DATA PRE-PROCESSING

  // Genre Buttons
  var genreSet = {};
  csv.forEach((d,i) => {
    d.genreArray = d.genres.split("|")
    d.genreArray.forEach((genre) => {
      if (genreSet.hasOwnProperty(genre)) {
        genreSet[genre]++;
      } else {
        genreSet[genre] = 1;
      }
    })
    d.id = i;
  })
  var topGenres = Object.keys(genreSet).sort((a,b) => genreSet[b] - genreSet[a])
  // console.log(genreSet);
  // console.log(topGenres)

  var buttonRow = d3.select("#genre-buttons")
  var gi = 0;
  topGenres.forEach((genre) => {
    if (gi++ < 8) {
      buttonRow.append("label")
        .attr("class", "btn btn-secondary")
        .html('<input type="radio" name="options" id="option2" value="' + genre + '" autocomplete="off"> ' + genre)
    }
  })

  // Constructing Graphs

  // Parallel Coordinates
  var p_svg = d3.select("#parallel").append("svg")
    .attr("width", p_width + p_margin.left + p_margin.right)
    .attr("height", p_height + p_margin.top + p_margin.bottom)
    .append("g")
    .attr("transform", "translate(" + p_margin.left + "," + p_margin.top + ")");

  var valid_keys = ["title_year", "cast_total_facebook_likes", "duration", "facenumber_in_poster"]
  p_x.domain(p_dimensions = d3.keys(csv[0]).filter(function(d) {
    return d != "name" && valid_keys.includes(d) && (p_y[d] = d3.scaleLinear()
        .domain(d3.extent(csv, function(p) { return +p[d]; }))
        .range([p_height, 0]));
  }));

  p_y["title_year"] = d3.scaleLinear().domain([2009, 2017]).range([p_height, 0]);

  // Add blue foreground lines for focus.
  p_foreground = p_svg.append("g")
      .attr("class", "foreground")
      .selectAll("path")
      .data(csv)
      .enter().append("path")
      .classed("pc-entry", true)
      .attr("id", function(d) { return d.id })
      .attr("d", path)
      .classed("fg-pc-entry", true)
      .on("mouseover", function(d) {
        updateHover(d);
      })
      .on("mouseout", function(d) {
        updateHover(null);
      })
      .on("click", function(d) {
        showDetail(d);
      });

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
      .style("fill", "black")
      .style("font-weight", "bold")
      .style("text-transform", "capitalize")
      .text(function(d) {
        var fixed = d.replace(/_/g, " ");
        return fixed;;
      });

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

  function path(d) {
      return line(p_dimensions.map(function(p) { return [p_x(p), p_y[p](d[p])]; }));
  }

  var activeBrushes = [];

  function brush() {
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

    updateDisplay();
  }

  // Scatterplot

  var s_svg = d3.select("#chart").append('svg')
    .attr('width', s_width)
    .attr('height', s_height);

  var grossExtent = d3.extent(csv, function(row) { return +row.gross });
  var imdbScoreExtent = d3.extent(csv, function(row) { return +row.imdb_score });
  var durationExtent = d3.extent(csv, function(row) { return +row.duration });
  var votedUsersExtent = d3.extent(csv, function(row) { return +row.num_voted_users });
  var timeExtent = d3.extent(csv, function(row) { return +row.title_year });

  var xScale = d3.scaleLog().domain(votedUsersExtent).range([50, s_width-30]);
  var yScale = d3.scaleLinear().domain(imdbScoreExtent).range([s_height-30, 30]);

  var xAxis = d3.axisBottom().scale(xScale);
  var yAxis = d3.axisLeft().scale(yScale);

  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  var points = s_svg.selectAll("circle")
    .data(csv)
    .enter()
    .append("circle")
    .attr("id", function(d) { return d.id } )
    .attr("stroke", "black")
    .attr("cx", function(d) {
      if (d.num_voted_users != "") {
        return xScale(d.num_voted_users);
      } else {
        return -20;
      }
    })
    .attr("cy", function(d) { return yScale(d.imdb_score); })
    .attr("r", 5)
    .on("mouseover", function(d) {
      updateHover(d);
    })
    .on("mouseout", function() {
      updateHover(null);
    })
    .on("click", function(d) {
      showDetail(d);
    });

  s_svg.append("g")
		.attr("transform", "translate(0,"+ (s_height-40)+ ")")
		.call(xAxis)
		.append("text")
		.attr("class", "label")
		.attr("x", s_width/2 + 30)
		.attr("y", 30)
		.style("text-anchor", "end")
    .style("fill", "black")
    .style("font-weight", "bold")
		.text("Duration");

  s_svg.append("g")
		.attr("transform", "translate(50, 0)")
		.call(yAxis)
		.append("text")
		.attr("class", "label")
		.attr("transform", "rotate(-90)")
    .attr("x", -s_height/2 + 30)
		.attr("y", -35)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
    .style("fill", "black")
    .style("font-weight", "bold")
		.text("IMDB Score");

  // Interaction Logic

  function showDetail(d) {
    $("#placeholder-text").fadeOut();
    $("#details-text").fadeOut(400, function() {
      d3.select("#title").html(d.movie_title);
      d3.select("#year").html(d.title_year);
      d3.select("#director").html("<b>Director</b> " + d.director_name);
      d3.select("#actor1").html("<b>Cast</b><br/><i class='fas fa-user'></i> " + d.actor_1_name);
      d3.select("#actor2").html("<i class='fas fa-user'></i> " + d.actor_2_name);
      d3.select("#actor3").html("<i class='fas fa-user'></i> " + d.actor_3_name);
      d3.select(".progress-bar").style("width", d.imdb_score*10 + "%");
      d3.select(".progress-bar").attr("aria-valuenow", d.imdb_score*10);
      d3.select(".progress-bar").html(d.imdb_score + "/10");
      $(".progress").fadeIn();
      $("#details-text").fadeIn();
    });
    $("#details-poster-img").fadeOut(400, function() {
      d3.select("#details-poster-img").attr("src", getPoster(d.movie_title));
      $("#details-poster-img").fadeIn();
    });
  }

  function inFocus(data) {
    return (genreFilter == "All" || data.genreArray.includes(genreFilter))
      && activeBrushes.every((active) => {
          return active.extent[1] <= data[active.dimension] && data[active.dimension] <= active.extent[0];
      });
  }

  function updateHover(data) {
    function correctID(d) {
      if (data == null) {
        return false
      }
      return d.id == data.id;
    }

    if (data && inFocus(data)) {
      tooltip.style("opacity", .9)
        .html("<b>" + data.movie_title + "</b> " + data.title_year
              + "<br/>" + data.director_name
              + "<br/>" + data.duration)
        .style("left", (d3.event.pageX + 14) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
    } else {
      tooltip.style("opacity", 0)
    }

    d3.selectAll("circle")
      .classed("hover-circle", false)
      .filter(inFocus)
      .filter(correctID)
      .classed("hover-circle", true)
      .call((d) => {
        d._groups[0].forEach((node) => {
          moveToFront(node);
        })
      });

    d3.selectAll(".foreground")
      .selectAll("path")
      .classed("hover-pc-entry", false)
      .filter(inFocus)
      .filter(correctID)
      .classed("hover-pc-entry", true)
      .call((d) => {
        d._groups[0].forEach((node) => {
          moveToFront(node);
        })
      });
  }

  function moveToFront(node) {
    node.parentNode.appendChild(node);
  };

  function updateDisplay() {
    d3.selectAll("circle")
      .classed("hidden-circle", true)
      .filter(inFocus)
      .classed("hidden-circle", false)
      .call((d) => {
        d._groups[0].forEach((node) => {
          moveToFront(node);
        })
      });

    d3.selectAll(".foreground")
      .selectAll("path")
      .classed("fg-pc-entry", false)
      .filter(inFocus)
      .classed("fg-pc-entry", true)
      .call((d) => {
        d._groups[0].forEach((node) => {
          moveToFront(node);
        })
      });
  }

  $("#genre-buttons").click((event) => {
    genreFilter = event.target.children[0].value;
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
