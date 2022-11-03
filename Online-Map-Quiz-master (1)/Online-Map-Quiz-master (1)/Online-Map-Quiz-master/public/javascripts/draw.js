$(document).ready(() => {
    drawMap('#container'); 
})

//지도 그리기
function drawMap(target) {
    var width = 1600; //지도의 넓이
    var height = 900; //지도의 높이
    var initialScale = 30000; //확대시킬 값
    var initialX = -65700; //초기 위치값 X
    var initialY = 21500; //초기 위치값 Y
    // let initialScale = 350
    // let initialX = 1200
    // let initialY = 500
    var labels;

    var projection = d3.geo
        .mercator()
        .scale(initialScale)
        .translate([initialX, initialY]);
    var path = d3.geo.path().projection(projection);
    var zoom = d3.behavior
        .zoom()
        .translate(projection.translate())
        .scale(projection.scale())
        .scaleExtent([height, 800 * height])
        .on('zoom', zoom);

    var svg = d3
        .select(target)
        .append('svg')
        .attr('width', width + 'px')
        .attr('height', height + 'px')
        .attr('id', 'map')
        .attr('class', 'map');

    var states = svg
        .append('g')
        .attr('id', 'states')
        .call(zoom);

    states
        .append('rect')
        .attr('class', 'background')
        .attr('width', width + 'px')
        .attr('height', height + 'px');

    //geoJson데이터를 파싱하여 지도그리기
        // let map = '/geojson/AL_00_D001_20210703/AL_00_D001_20210703(EMD)/Incheon (EMD).geojson'
        let map = '/geojson/SIG.geojson'
        // let map = '/geojson/US States.geojson'
        d3.json(map, function(json) {
        // d3.json('/geojson/AL_00_D001_20210703/AL_00_D001_20210703(SIG)/Without Gu.geojson', function(json) {
        // d3.json('/geojson/Asia.geojson', function(json) {
        // d3.json('geojson/korea.json', function(json) {
        states
            .selectAll('path') //지역 설정
            .data(json.features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'fog')
            .attr('id', function(d) {
                // return d.properties.A2;
                // return d.properties.PLACENAME;
                return d.properties.id
            });

        
        labels = states
            .selectAll('text')
            .data(json.features) //라벨표시
            .enter()
            .append('text')
            .attr('transform', translateTolabel)
            .attr('id', function(d) {
                return 'label-' + d.properties.name_eng;
            })
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .text(function(d) {
                // return d.properties.A2;
                // return d.properties.PLACENAME;
                return d.properties.state
            });
        
    });

    //텍스트 위치 조절 - 하드코딩으로 위치 조절을 했습니다.
    function translateTolabel(d) {
        var arr = path.centroid(d);
        if (d.properties.code == 31) {
            //서울 경기도 이름 겹쳐서 경기도 내리기
            arr[1] +=
                d3.event && d3.event.scale
                    ? d3.event.scale / height + 20
                    : initialScale / height + 20;
        } else if (d.properties.code == 34) {
            //충남은 조금 더 내리기
            arr[1] +=
                d3.event && d3.event.scale
                    ? d3.event.scale / height + 10
                    : initialScale / height + 10;
        }
        return 'translate(' + arr + ')';
    }

    
    function zoom() {
        projection.translate(d3.event.translate).scale(d3.event.scale);
        states.selectAll('path').attr('d', path);
        labels.attr('transform', translateTolabel);
    }
}