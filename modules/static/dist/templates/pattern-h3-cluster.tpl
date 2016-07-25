<!-- pattern-h3-cluster -->
<div class='cqz-result-h3 cqz-result-padding cqz-result-pattern'>
      <div class='cqz-ez-title cliqz-pattern-title-h3 overflow'
           url='{{data.url}}'
           arrow='false'
           dont-remove='true'>
          {{ data.title }}
      </div>
      <div class='cliqz-pattern'>
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
            <div class='cliqz-pattern-element-title'>{{ title }}</div>
            <div class='cliqz-pattern-element-link'>{{ link }}</div>
        </div>
        {{/each}}
    </div>
    {{>logo}}
</div>
<!-- end pattern-h3-cluster -->
