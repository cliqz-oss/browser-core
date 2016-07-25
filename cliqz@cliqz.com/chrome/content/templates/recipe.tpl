{{#if (recipe_rd_template data.richData)}}
<div class="cqz-result-h1 cqz-rd cqz-result-padding">
  {{#with data}}
    <div class="cqz-rd-body">
        <div class="cqz-result-title overflow" arrow-override=''><a href="{{../url}}" extra="title">{{richData.name}}</a></div>
        <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>
        <div class="cqz-rd-h3-snippet">
            {{#if richData.image}}
               <div class="cqz-rd-img_div cqz-image-round">
                   <img src="{{richData.image}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
               </div>
            {{/if}}
               <div>
                          <div class="cqz-rd-info">{{local 'CookTime' richData.cook_time}}</div>
                          <div class="cqz-rd-info">{{local 'Serves'}}: {{richData.numportion}}</div>
                          {{#if richData.url_ratingimg}}
                              <img src="{{richData.url_ratingimg}}" class="cqz-rd-rateimg cqz-rd-snippet_hspacing" onerror="this.style.display='none';"/>
                              <div class="cqz-rd-rate">{{richData.total_review}} {{local 'Votes'}}</div>
                          {{/if}}
               </div>
        </div>
        <div class="multi-ellipsis">
            <p>{{richData.des}}</p>
        </div>
    </div>
  {{/with}}
  {{>EZ-category}}
  {{> logo}}
</div>
{{else}}
        {{>rd-h3-w-rating}}
{{/if}}
