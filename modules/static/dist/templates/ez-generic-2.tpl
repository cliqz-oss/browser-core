<!-- Resize to include history -->
<div
  {{#if data.urls}}
    class="cqz-result-h1 cqz-result-padding cqz-result-center"
  {{else}}
    class="cqz-result-h2 cqz-result-padding cqz-result-center"
  {{/if}}
>


    <div class='cqz-result-title overflow' arrow-override=''><a href="{{../url}}"  extra="title">{{ emphasis data.name text 2 true }}</a></div>
    <div class='cqz-result-url overflow'  extra="url">
      {{ emphasis urlDetails.friendly_url text 2 true }}
    </div>
    <div class='cqz-result-content'>
      {{#with data}}
          <div class='multi-ellipsis'>
            <p>
              {{description}}
            </p>
          </div>
            {{#if zeroInf}}
          <div class="clz_zero_info_sec">
            {{#each (zeroclick_prep zeroInf)}}
              <div class="clz_zero_info" cliqz-action="copy_val">
                <img src="{{img}}" class="cqz-zero-img clz_copy" onerror="this.style.display='none';"/>
                <span extra="zeroclz" class="clz_copy">{{val}} </span>
              </div>
              {{/each}}
          </div>
            {{/if}}
      {{/with}}

      {{>EZ-history}}
    </div>
    {{>partials/ez-generic-buttons}}
    {{> logo}}
</div>