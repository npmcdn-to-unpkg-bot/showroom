/************************************
* simple D3 line chart
* zoomable by mouse drag
*************************************/
function simpleD3LinearChart(domElementId, margin, xDomainInit, yDomainInit){
	var drag = d3.drag(),
	width = document.getElementById(domElementId).offsetWidth - margin.left - margin.right,
	height = document.getElementById(domElementId).offsetHeight - margin.top - margin.bottom,
	_this = this;

	if (width < 0){
		margin.left = 0;
		margin.right = 0;
		width = document.getElementById(domElementId).offsetWidth;
	}
	
	if (height < 0){
		margin.top = 0;
		margin.bottom = 0;
		height = document.getElementById(domElementId).offsetHeight;
	}
	
	var svg = d3.select("#" + domElementId).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),

		xScale = d3.scaleLinear().range([0, width]).domain(xDomainInit || [0, 100]),
		yScale = d3.scaleLinear().range([height, 0]).domain(yDomainInit || [-50, 10]),
		xAxis = d3.axisBottom(xScale),
		yAxis = d3.axisLeft(yScale),

		line = d3.line()
			.x(function(d) {
				return xScale(d[0])
			})
			.y(function(d) {
				return yScale(d[1])
			});
			//.curve(d3.curveBasis);

	svg.append("g")
		.attr("class", "x axis")
		.call(xAxis)
		.attr("transform", "translate(0," + height + ")");

	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)

	svg.append("clipPath")
		.attr("id", domElementId + "-clip")
		.append("rect")
		.attr("width", width)
		.attr("height", height);

	var zoomOverlay = svg.append("rect")
		.attr("width", width - 10)
		.attr("height", height)
		.attr("class", "zoomOverlay")
		.attr("id", domElementId + "-zoomOverlay")
		.call(drag);

	var zoombox = svg.append("rect")
		.attr("width", 0)
		.attr("height", 0)
		.attr("x", 0)
		.attr("y", 0)
		.attr("class", domElementId + "-zoombox");

	var updateAxisAndRedraw = function(xdomain, ydomain){
		var t = svg.transition().duration(750);
		if ((typeof xdomain !== "undefined") && (typeof ydomain !== "undefined")){
			xScale.domain(xdomain);
			yScale.domain(ydomain);
			t.select(".x.axis").call(xAxis);
			t.select(".y.axis").call(yAxis);
		}

		t.selectAll(".line").attr("d", line);
	}

	var dragStartPos, draggingPos, dragEndPos;
	
	drag.on("start", function() {
		dragStartPos = d3.mouse(this);
	});

	drag.on("drag", function() {
		draggingPos = d3.mouse(this);
		d3.select("." + domElementId + "-zoombox")//.transition().duration(1)
			.attr("x", Math.min(dragStartPos[0], draggingPos[0]))
			.attr("y", Math.min(dragStartPos[1], draggingPos[1]))
			.attr("width", Math.abs(dragStartPos[0] - draggingPos[0]))
			.attr("height", Math.abs(dragStartPos[1] - draggingPos[1]));
	});
	
	drag.on("end", function() {
		var x1, x2, y1, y2;
		dragEndPos = d3.mouse(this);
		if ((Math.abs(dragStartPos[0] - dragEndPos[0]) > 1) && (Math.abs(dragStartPos[1] - dragEndPos[1]) > 1)) {
			x1 = xScale.invert( Math.min(dragStartPos[0], dragEndPos[0]) );
			x2 = xScale.invert( Math.max(dragStartPos[0], dragEndPos[0]) );
			y1 = yScale.invert( Math.max(dragStartPos[1], dragEndPos[1]) );
			y2 = yScale.invert( Math.min(dragStartPos[1], dragEndPos[1]) );
			
			d3.select("." + domElementId + "-zoombox")
				.attr("width", 0)
				.attr("height", 0)
				.attr("x", -1)
				.attr("y", -1);				

			updateAxisAndRedraw([x1, x2], [y1, y2]);
		}
	});

	var zoomoutBox = svg.append("g")
		.attr("transform", function(d){return "translate(0," + (height + margin.bottom - 20) + ")"});;

	zoomoutBox.append("rect")
		.attr("class", "zoomOut")
		.attr("width", 75)
		.attr("height", 40);

	zoomoutBox.append("text")
		.attr("class", "zoomOutText")
		.attr("width", 75)
		.attr("height", 30)
		.attr("dx", 5)
		.attr("dy", 15)
		.text("Zoom Out");
		
	var xLabel = svg.append("g")
		.attr("transform", function(d){return "translate(" + (width / 2 - 60) + "," + (height + margin.bottom - 5) + ")"})
		.append("text")
		.attr("width", 75)
		.attr("height", 30)
		.text("Frequency(GHz)");
	
	this.yLabel = svg.append("g")
		.attr("transform", function(d){return "translate(0," + "-10" + ")"});
	
	this.zoomoutBox = zoomoutBox;
	this.svg = svg;
	this.line = line;
	this.drag = drag;
	this.updateAxisAndRedraw = updateAxisAndRedraw;
	this.domElementId = domElementId;
}

simpleD3LinearChart.prototype.update = function(data, autoScale){
	var xdata = data.map(function(eachData){
		return eachData.data.map(function(xy){
			return xy[0];
		})
	}),
	ydata = data.map(function(eachData){
		return eachData.data.map(function(xy){
			return xy[1];
		})
	}),
	xdomain = [
		_.min(xdata.map(function(o){return _.min(o)})),
		_.max(xdata.map(function(o){return _.max(o)}))
	],
	ydomain = [
		_.min(ydata.map(function(o){return _.min(o)})),
		_.max(ydata.map(function(o){return _.max(o)}))
	],
	colors = ["steelblue", "green", "purple"],
	_this = this;
	
	var linePath = this.svg.selectAll(".line")
		.data(data.map(function(d){return d.data}));
		
	linePath
		.enter()
		.append("path")
		.attr("class", function(d, i){return "line line" + i})
		.attr("clip-path", "url(#" + _this.domElementId + "-clip)")
		.style("stroke", function(d, i){return (i < colors.length)? colors[i] : "red"})
		.attr("d", this.line);

	linePath
		.attr("d", this.line);
		
	linePath
		.exit().remove();

	if (autoScale){
		this.updateAxisAndRedraw(xdomain, ydomain);
	} else {
		this.updateAxisAndRedraw();
	}
		
	var yLabels = this.yLabel.selectAll(".ylabel-text")
		.data(data.map(function(d){return d.label}));
	
	yLabels
		.enter()
		.append("text")
		.attr("class", "ylabel-text")
		.attr("width", 75)
		.attr("height", 30)
		.attr("fill", function(d, i){return (i < colors.length)? colors[i] : "red"})
		.attr("dx", function(d, i){return 100 * i})
		.text(function(d){return "- " + d});
	
	yLabels
		.text(function(d){return "- " + d});
	
	yLabels
		.exit().remove();
	
	this.zoomoutBox
		.on("click.foo", function() {
			_this.updateAxisAndRedraw(xdomain, ydomain);
		})
}

/************************************
* simple D3 bar chart
*************************************/
function simpleD3BarChart(domElementId, margin){
	var width = document.getElementById(domElementId).offsetWidth - margin.left - margin.right,
	height = document.getElementById(domElementId).offsetHeight - margin.top - margin.bottom,
	_this = this;

	if (width < 0){
		margin.left = 0;
		margin.right = 0;
		width = document.getElementById(domElementId).offsetWidth;
	}
	
	if (height < 0){
		margin.top = 0;
		margin.bottom = 0;
		height = document.getElementById(domElementId).offsetHeight;
	}

	var svg = d3.select("#" + domElementId).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
		xScale = d3.scaleBand().rangeRound([0, width]).paddingInner(0.2).paddingOuter(0.2),
		yScale = d3.scaleLinear().range([height, 0]),
		xAxis = d3.axisBottom(xScale),
		yAxis = d3.axisLeft(yScale).ticks(10, "%");

	svg.append("g")
		.attr("class", "x axis")
		.call(xAxis)
		.attr("transform", "translate(0," + height + ")");

	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis);
	
	this.svg = svg;
	this.xScale = xScale;
	this.yScale = yScale;
	this.xAxis = xAxis;
	this.yAxis = yAxis;
	this.height = height;
}

simpleD3BarChart.prototype.update = function(data){
	var _this = this;

  this.xScale.domain(data.map(function(d) { return d.key; }));
  this.yScale.domain([0, d3.max(data, function(d) { return d.value; })]);
	this.svg.select(".x.axis").call(this.xAxis);
	this.svg.select(".y.axis").call(this.yAxis);

  var allBar = this.svg.selectAll(".bar").data(data);
	
	allBar
    .enter().append("rect")
		.attr("class", "bar")
		.attr("x", function(d) { return _this.xScale(d.key); })
		.attr("width", _this.xScale.bandwidth())
		.attr("y", function(d) { return _this.yScale(d.value); })
		.attr("height", function(d) { return _this.height - _this.yScale(d.value); });
	
	allBar
		.attr("x", function(d) { return _this.xScale(d.key); })
		.attr("width", _this.xScale.bandwidth())
		.attr("y", function(d) { return _this.yScale(d.value); })
		.attr("height", function(d) { return _this.height - _this.yScale(d.value); });

	allBar.exit().remove();
};