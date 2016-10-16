var step_point = 20;
var current_svg_xml = "";
var event;

$(function() {
    document.getElementById('dropzone').addEventListener('drop', manageDropFromTitle, false);

    $("#step_point").val(step_point.toString());
    $('#btn-apply').click(function() {
        step_point = parseInt($("#step_point").val());
        generatePointsFromSvg();
    });

    paper = Raphael(document.getElementById("canvas"), '100%', '70%');
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
                console.log(file);
                $(".note").hide();

                if (previousFile != null) {
                    this.removeFile(previousFile);
                }
                previousFile = file;

                read = new FileReader();

                read.readAsBinaryString(file);

                read.onloadend = function(){
                    current_svg_xml = read.result;
                    generatePointsFromSvg(read.result);
                }        
            });
        }
    });
});

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
    var offset_path_x = 0;
    var offset_path_y = 0;
    for (var i = 0; i < paths.length; ++i) {
        var path = $($(paths).get(i)).attr('d').replace(' ', ',');

        // draw the shape normally
        shape = paper.path(path);
        var bbox_path = shape.getBBox();
        shape.remove();

        // Get info on first path
        if (i == 0) {
            var first_point = Raphael.getPointAtLength(path, c);
            offset_path_x = (first_point.x * -1) + (paper.canvas.clientWidth / 2);
            offset_path_y = (first_point.y * -1) + (paper.canvas.clientHeight / 2);
        }

        // Show original shapes infos
        // paper.path(path);
        // var container = paper.rect(bbox_path.x, bbox_path.y, bbox_path.width, bbox_path.height);
        // container.attr("stroke", "red");

        // get points at regular intervals
        var data_points = "";
        var color = randomColor();
        for (var c = 0; c < Raphael.getTotalLength(path); c += step_point) {
            var point = Raphael.getPointAtLength(path, c);

            data_points += point.x + "," + point.y + "<br>";
            var circle = paper.circle(point.x, point.y, 2)
                .attr("fill", color)
                .attr("stroke", "none")
                .transform("T" + offset_path_x + "," + offset_path_y);
        }

        addBelow(i, color, data_points);
    }
    
    $('.bellows').bellows();        
}

function addBelow(index, color, data) {
      var below = "";
      
      below += "<div class='bellows__item'><div class='bellows__header' style='background-color:" + color + "'>";
      below += "Path " + index;
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