<!--this template is similar to people, youtube, but with rating starts,
used initially for food, movie, game (in 1 height results)
IT IS USED AS A PARTIAL template
-->

<div class="cqz-result-h3 cqz-rd-h3 cqz-result-padding2">
  {{#with data}}
        {{#if richData.image}}
            <div class="cqz-image-round cqz-rd-h3img-div" style="max-width: {{image_rd_specification richData}}" >
                <img src="{{richData.image}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
            </div>
        {{/if}}

        <div class="cqz-rhh3-snipet-txt">
            <div class="cqz-result-title overflow" arrow-override=''><a href="{{../url}}" extra="title">{{richData.name}}</a></div>
            <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>
            <div class="cqz-rd-snippet_hspacing">
                {{#if richData.url_ratingimg}}
                    <img src="{{richData.url_ratingimg}}" class="cqz-rd-rateimg " onerror="this.style.display='none';" extra="des-rate"/>
                {{else}}
                    {{#if (logic richData.rating '&&' richData.rating.img)}}
                        <img src="{{richData.rating.img}}" class="cqz-rd-rateimg " onerror="this.style.display='none';" extra="des-rate"/>
                    {{/if}}
                {{/if}}
                <span extra="des">{{richData.des}}</span>
            </div>
        </div>
 {{/with}}
 {{> logo}}
</div>
