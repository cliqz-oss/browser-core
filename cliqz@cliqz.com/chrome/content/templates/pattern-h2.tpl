<div class='cqz-result-h2 cqz-result-padding cqz-result-pattern'>
      <div class='cqz-ez-title cliqz-pattern-title-h2 overflow' arrow='false' url='{{data.url}}'>
          {{ emphasis data.title text 2 true }}
      </div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        ' extra="url">
            {{ emphasis urlDetails.friendly_url text 2 true }}
        </div>
      <div class='cliqz-pattern cqz-5-history-results'>
        {{#each data.urls}}
        <div class='cliqz-pattern-element overflow'
            {{#if favicon }}
             style='background-image: url({{ favicon }})'
             {{else}}
              style='padding-left: 0px;'
             {{/if}}
             url='{{href}}' shortUrl='{{link}}'
             domain='{{domain}}'
             extra='{{extra}}'
             arrow='false'
             kind='{{ kind_printer kind }}'>
            <div class='cliqz-pattern-element-title'>{{ emphasis title ../text 2 true }}</div>
            <div class='cliqz-pattern-element-link'>{{ emphasis link ../text 2 true }}</div>
        </div>
        {{/each}}
    </div>
    {{>logo}}
</div>
