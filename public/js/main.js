/**
 * Load TopoJSON data of the world and the data of the world wonders
 */

Promise.all([


    d3.json('data/countries-110m_v2.json'),
    d3.csv('data/region_population_density.csv'),
    d3.csv('data/worldcities_v2.csv')
]).then(data => {
    const geoData = data[0];
    const regionData = data[1];
    const countryData = data[2];

    console.log(countryData)
    console.log(regionData)
    geoData.objects.countries.geometries.forEach(d => {
        for (let i = 0; i < regionData.length; i++) {
            if (d.properties.name == regionData[i].region) {
                d.properties.pop_density = +regionData[i].pop_density;
            }
        }
    });

    const choroplethMap = new ChoroplethMap({
        parentElement: '#map'
    }, data[0], data[1], data[2]);
})
    .catch(error => console.error(error));
