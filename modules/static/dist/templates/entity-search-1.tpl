<!-- Resize to include history -->
<div
  {{#if data.urls}}
    class="cqz-result-h1 cqz-result-padding"
  {{else}}
    class="cqz-result-h2 cqz-result-padding"
  {{/if}}
>
  <div class="cqz-ez-title cqz-ez-search-title" extra="title">
    <a href="{{url}}" extra="title">{{data.search_provider}}</a>
  </div>
  {{#unless data.no-search-box}}
    <div>
      <div class="cqz-ez-search-box"
           style="{{#with logo}}border-color: {{backgroundColor}}; background-color: {{backgroundColor}}; {{/with}}"
           cliqz-action="searchEZbutton"
           >
        <input
          type="text" class="cqz-ez-search-box-input"
          cliqz-action="stop-click-event-propagation"
          search-url="{{data.search_url}}"
          search-provider="{{data.search_provider}}"
          logg-action-type="{{data.logg_action_type}}"
          onkeydown="CLIQZ.UI.entitySearchKeyDown(event, this)"
        />
      </div>
    </div>
  {{/unless}}
  <div class="cqz-ez-search-app-box">
    {{#each data.links}}
      <div
        class="cqz-ez-search-app transition"
        style="background-color: {{this.background_color_icon}}; background-image: url({{this.icon_url}})"
        url="{{this.url}}"
        extra="link-{{this.logg_as}}"
        >
            {{this.text}}
      </div>
    {{/each}}
  </div>
  {{>EZ-history}}
  {{>logo}}

</div>
