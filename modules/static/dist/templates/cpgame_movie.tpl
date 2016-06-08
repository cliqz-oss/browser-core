{{#if (cpgame_movie_rd_template data.richData)}}
<div class="cqz-result-h1 cqz-rd cqz-result-padding">
  {{#with data}}
    <div class="cqz-rd-body">
        <div class="cqz-result-title overflow" arrow-override=''><a extra="title" href="{{../url}}">{{richData.name}}</a></div>
        <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>

        <div class="cqz-rd-h2-snippet">
            {{#if richData.image}}
            <div class="cqz-rd-img_div cqz-image-round">
               <img src="{{richData.image}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
            </div>
            {{/if}}

            {{>pcgame_movie_side_snippet}}
        </div>
    </div>
  {{/with}}
  {{>partials/ez-generic-buttons}}
  {{> logo}}
</div>
{{else}}
        {{>rd-h3-w-rating}}
{{/if}}
