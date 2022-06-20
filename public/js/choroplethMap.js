class ChoroplethMap {
  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _geoData, _countryData, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1400,
      containerHeight: _config.containerHeight || 900,
      margin: _config.margin || { top: 0, right: 0, bottom: 0, left: 0 },
      tooltipPadding: 10,
      legendBottom: 50,
      legendLeft: 50,
      legendRectHeight: 12,
      legendRectWidth: 150
    }
    this.geoData = _geoData;
    this.countryData = _countryData;
    this.data = _data;
    this.initVis();

  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */


  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // Append group element that will contain our actual chart 
    // and position it according to the given margin config
    vis.chart = vis.svg.append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Initialize projection and path generator
    vis.projection = d3.geoMercator();
    vis.geoPath = d3.geoPath().projection(vis.projection);

    vis.colorScale = d3.scaleLinear()
      .range(['#c9fbf5', '#000000'])
      .interpolate(d3.interpolateHcl);


    // Initialize gradient that we will later use for the legend
    vis.linearGradient = vis.svg.append('defs').append('linearGradient')
      .attr("id", "legend-gradient");

    // Append legend
    vis.legend = vis.chart.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom})`);

    vis.legendRect = vis.legend.append('rect')
      .attr('width', vis.config.legendRectWidth)
      .attr('height', vis.config.legendRectHeight);

    vis.legendTitle = vis.legend.append('text')
      .attr('class', 'legend-title')
      .attr('dy', '.35em')
      .attr('y', -10)
      .text('Pop. density per square km')
    vis.symbolScale = d3.scaleSqrt()
      .range([4, 25]);
    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    const popDensityExtent = d3.extent(vis.geoData.objects.countries.geometries, d => d.properties.pop_density);
    // const popDensityExtent = d3.extent(vis.data.objects.countries.geometries, d => d.properties.population);

    // Update color scale
    vis.colorScale.domain(popDensityExtent);

    // Define begin and end of the color gradient (legend)
    vis.legendStops = [
      { color: '#c9fbf5', value: popDensityExtent[0], offset: 0 },
      { color: '#000000', value: popDensityExtent[1], offset: 100 },
    ];
    console.log(vis.data);
    vis.symbolScale.domain(d3.extent(vis.data, d => d.population));
    vis.colorScaleCircle = d3.scaleOrdinal()
      .range(['#1916FE', '#FECF16', '#FE2316'])
    vis.data.forEach(d => {
      d.showLabel = (d.name == 'Chichen Itza') || (d.name == 'Great Wall')
    });
    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // Convert compressed TopoJSON to GeoJSON format
    const countries = topojson.feature(vis.geoData, vis.geoData.objects.countries)

    // Defines the scale of the projection so that the geometry fits within the SVG area
    vis.projection.fitSize([vis.width, vis.height], countries);

    // Append world map
    const countryPath = vis.chart.selectAll('.country')
      .data(countries.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', vis.geoPath)
      .attr('fill', d => {
        if (d.properties.pop_density) {
          return vis.colorScale(d.properties.pop_density);
        } else {
          return 'url(#lightstripe)';
        }
      });
    // Append symbols
    const geoSymbols = vis.chart.selectAll('.geo-symbol')
      .data(vis.data)
      .join('circle')
      .attr('class', 'geo-symbol')
      .attr('r', d => Math.sqrt(parseInt(d.population) * 0.000003))
      .attr('cx', d => vis.projection([d.lon, d.lat])[0])
      .attr('cy', d => vis.projection([d.lon, d.lat])[1])
      .attr('fill', function (d) {
        if (d.capital == 'primary') {
          return "#FF0000";
        } else if (d.capital != 'primary') {
          if (d.population > 9000000) {
            return "#FF9700";
          }
          else if (d.population < 9000000) {
            return "#0000FF";
          }

        }

      })
      .style("font", "10px sans-serif")
      .attr("text-anchor", "middle")
      .style("opacity", 0.55);
    countryPath
      .on('mousemove', (event, d) => {
        const popDensity = d.properties.pop_density ? `<strong>${d.properties.pop_density}</strong> pop. density per km<sup>2</sup>` : 'No data available';
        d3.select('#tooltip')
          .style('display', 'block')
          .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
          .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
          .html(`
              <div class="tooltip-title">${d.properties.name}</div>
              <div>${popDensity}</div>
            `);
      })
    geoSymbols
      .on('mousemove', (event, d) => {
        d3.select('#tooltip')
          .style('display', 'block')
          .style('left', `${event.pageX + vis.config.tooltipPadding}px`)
          .style('top', `${event.pageY + vis.config.tooltipPadding}px`)
          .html(`
              <div class="tooltip-title">City: ${d.city}</div>
              <div>Population: ${d.population}<br/>Country: ${d.country}<br/>Capital: ${d.capital}</div>
            `);
      })
      .on('mouseleave', () => {
        d3.select('#tooltip').style('display', 'none');
      });

    // Add legend labels
    vis.legend.selectAll('.legend-label')
      .data(vis.legendStops)
      .join('text')
      .attr('class', 'legend-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('y', 20)
      .attr('x', (d, index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text(d => Math.round(d.value * 10) / 10);

    // Update gradient for legend
    vis.linearGradient.selectAll('stop')
      .data(vis.legendStops)
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    vis.legendRect.attr('fill', 'url(#legend-gradient)');
    const geoSymbolLabels = vis.chart.selectAll('.geo-label')
      .data(vis.data)
      .join('text')
      .attr('class', 'geo-label')
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .attr('x', d => vis.projection([d.lon, d.lat])[0])
      .attr('y', d => (vis.projection([d.lon, d.lat])[1] - 16))
      .text(function (d) {
        if (d.capital == 'primary') {
          if (d.population > 15000000) {
            return d.city;
          }
        } else if (d.capital != 'primary') {
          if (d.population > 15000000) {
            return d.city;
          }
        }
        // return d.city;
      })
  }
}