<div class='cqz-result-images cqz-result-images-{{ data.lines }}'>
     <div class='cqz-ez-title cqz-ez-images-title' extra="title">
        Images
    </div>

    <div  class='cliqz-images'>
        {{#each data.items}}
        <div class="cliqz-image-item"
             style='width:{{disp_width}}px; height:{{disp_height}}px;'
             type="image" url="{{ ref_url }}">
                <img class="cliqz-image-clear" src="{{ thumb.url}}"
                     id="{{im_url}}"
                     width="{{disp_width}}"
                     height="{{disp_height}}"
                     />
            <div class="cliqz-image-hilight"
                 style='width:{{disp_width}}px; max-width:{{disp_width}}px;'>
                {{width}} x {{height}} - {{domain}}
            </div>

        </div>
        {{/each}}
    </div>
</div>
