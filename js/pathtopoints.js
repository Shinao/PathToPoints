var step_point = 10;
var current_svg_xml = "";
var current_svg_width = 0;
var current_svg_height = 0;

$(function() {
    document.getElementById('dropzone').addEventListener('drop', manageDropFromTitle, false);

    $("#step_point").val(step_point.toString());
    $('#btn-apply').click(function() {
        HoldOn.open({message:"Applying new step points length to SVG"});
        step_point = parseInt($("#step_point").val());
        if (step_point <= 0) step_point = 1;
        setTimeout(generatePointsFromSvg, 500);
    });

    paper = Raphael(document.getElementById("canvas"), '100%', '100%');
    current_displayed_paths = null;

    var previousFile = null;

     $('#dropzone').dropzone({ 
        url: "/upload",
        maxFilesize: 5,
        maxThumbnailFilesize: 1,
        autoProcessQueue: false,
        //acceptedFiles: '.svg',
        init: function() {
            myDropzone = this;

            this.on('addedfile', function(file) {
                if (file.type != "image/svg+xml") {
                    $.notify("Invalid format, only SVG is supported", "error");
                    this.removeFile(file);
                    return;
                }

                HoldOn.open({message:"Generating points from SVG"});
                $(".note").hide();

                if (previousFile != null) {
                    this.removeFile(previousFile);
                }
                previousFile = file;
                read = new FileReader();

                read.readAsBinaryString(file);

                read.onloadend = function() {
                    current_svg_xml = read.result;
                    setTimeout(generatePointsFromSvg, 500);
                }   
            });
        }
    });

    // Directly drop the title logo to debug
    // current_svg_xml = $("#svgTitle")[0].outerHTML;
    // generatePointsFromSvg();
});

function getInfosFromPaths(paths) {
    var paths_info = [];
    var initialized = false;
    for (var i = 0; i < paths.length; ++i) {
        var path = $($(paths).get(i)).attr('d').replace(' ', ',');
        var shape = paper.path(path);
        var bbox_path = shape.getBBox();
        shape.remove();

        // Draw the shape
        // var shape = paper.path(path);
        // var bbox_path = shape.getBBox();
        // shape.remove();

        // Show shapes infos
        // paper.path(path);
        // var container = paper.rect(bbox_path.x, bbox_path.y, bbox_path.width, bbox_path.height);
        // container.attr("stroke", "red");

        if (!initialized) {
            initialized = true; 
            paths_info.bbox_top = paths_info.bbox_bottom = paths_info.bbox_left = paths_info.bbox_right = bbox_path;
            continue;
        }

        if (paths_info.bbox_top != bbox_path && (paths_info.bbox_top.y > bbox_path.y))
            paths_info.bbox_top = bbox_path;
        if (paths_info.bbox_bottom != bbox_path && (bbox_path.y + bbox_path.height > paths_info.bbox_bottom.y + paths_info.bbox_bottom.height))
            paths_info.bbox_bottom = bbox_path;
        if (paths_info.bbox_left != bbox_path && (paths_info.bbox_left.x > bbox_path.x))
            paths_info.bbox_left = bbox_path;
        if (paths_info.bbox_right != bbox_path && (bbox_path.x + bbox_path.width > paths_info.bbox_right.x + paths_info.bbox_right.width))
            paths_info.bbox_right = bbox_path;
    }

    paths_info.width = (paths_info.bbox_right.x + paths_info.bbox_right.width) - paths_info.bbox_left.x;
    paths_info.height = (paths_info.bbox_bottom.y + paths_info.bbox_bottom.height) - paths_info.bbox_top.y;
    paths_info.x = paths_info.bbox_left.x;
    paths_info.y = paths_info.bbox_top.y;
    if (paths_info.height > paths_info.width)
        paths_info.scale = (paths_info.height > paper.canvas.clientHeight) ? (paper.canvas.clientHeight / paths_info.height) : 1;
    else
        paths_info.scale = (paths_info.width > paper.canvas.clientWidth) ? (paper.canvas.clientWidth / paths_info.width) : 1;

        console.log(paths_info);

    // Display bboxes used for centering paths
    // var bboxes = [paths_info.bbox_right, paths_info.bbox_left, paths_info.bbox_top, paths_info.bbox_bottom];
    // for (var i = 0; i < 4; ++i) {
    //     var container = paper.rect(bboxes[i].x + 300, bboxes[i].y + 300, bboxes[i].width, bboxes[i].height);
    //     container.attr("stroke", "red");
    // }

    return paths_info;
}

function generatePointsFromSvg() {
    paper.clear();
    $('.bellows').remove();
    $('#settings').after("<div class='bellows'></div>");
    $('.bellows').show();

    var parser = new DOMParser();
    var doc = parser.parseFromString(current_svg_xml, "application/xml");
    var paths = doc.getElementsByTagName("path");
    current_displayed_paths = paths;

    // Read each paths from svg
    var paths_info = getInfosFromPaths(paths);
    var offset_path_x = (paths_info.x * paths_info.scale * -1) + (paper.canvas.clientWidth / 2) - (paths_info.width * paths_info.scale / 2);
    var offset_path_y = (paths_info.y * paths_info.scale * -1) + (paper.canvas.clientHeight / 2) - (paths_info.height * paths_info.scale / 2);
    for (var i = 0; i < paths.length; ++i) {
        var path = $($(paths).get(i)).attr('d').replace(' ', ',');

        // get points at regular intervals
        var data_points = "";
        var color = randomColor();
        var c;
        for (c = 0; c < Raphael.getTotalLength(path); c += step_point) {
            var point = Raphael.getPointAtLength(path, c);

            data_points += point.x + "," + point.y + "<br>";
            var circle = paper.circle(point.x * paths_info.scale, point.y * paths_info.scale, 2)
                .attr("fill", color)
                .attr("stroke", "none")
                .transform("T" + offset_path_x * paths_info.scale + "," + offset_path_y * paths_info.scale);
        }

        addBelow(i, color, data_points, c / step_point);
    }
    
    $('.bellows').bellows();
    HoldOn.close();  
}

function addBelow(index, color, data, nb_pts) {
      var below = "";
      
      below += "<div class='bellows__item'><div class='bellows__header' style='background-color:" + color + "'>";
      below += "Path " + index ;
      below += "<span>" + nb_pts + " pts</span>";
      below += "</div><div class='bellows__content'>";
      below += data + "</div></div>";

      $('.bellows').append(below);
  }

// Hacky function to manage "fake" drop from image title
function manageDropFromTitle(evt) {
    var svgUrl = evt.dataTransfer.getData('URL');
    
    // Load local svg file from URL
    if (svgUrl.startsWith("file://") && svgUrl.endsWith(".svg")) {
        current_svg_xml = $("#svgTitle")[0].outerHTML;
        generatePointsFromSvg();
        console.log(current_svg_xml);
    }
}