{{!-- maxNumberOfSlots is set for every result in UI.handleResults --}}
{{#if (logic maxNumberOfSlots '===' 3)}}
  <div class="cqz-result-h1 cqz-rd cqz-result-padding cqz-rd-recipe">
    {{#with data}}
      <div class="cqz-rd-body">
          <div class="cqz-result-title overflow" arrow-override=''>
            <a href="{{../url}}" extra="title">
             {{extra.rich_data.name}}
            </a>
          </div>
          <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>
          <div class="cqz-rd-h3-snippet">
              {{#if extra.rich_data.image}}
                 <div class="cqz-rd-img_div cqz-image-round">
                     <img src="{{extra.rich_data.image}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
                 </div>
              {{/if}}
                 <div>
                            <div class="cqz-rd-info">{{local 'CookTime' extra.rich_data.cook_time}}</div>
                            <div class="cqz-rd-info">{{local 'Serves'}}: {{extra.rich_data.numportion}}</div>
                            {{#if extra.rich_data.url_ratingimg}}
                                <img src="{{extra.rich_data.url_ratingimg}}" class="cqz-rd-rateimg" onerror="this.style.display='none';"/>
                                <div class="cqz-rd-rate">{{extra.rich_data.total_review}} {{local 'Votes'}}</div>
                            {{/if}}
                 </div>
          </div>
          <div class="cqz-multy-lines-ellipses cqz-line-vis-3">
              <p>{{extra.rich_data.des}}</p>
          </div>
      </div>
    {{/with}}
    {{>partials/ez-generic-buttons}}
    {{> logo}}
  </div>
{{else}}
        {{>rd-h3-w-rating}}
{{/if}}
