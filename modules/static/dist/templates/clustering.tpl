<div class='cliqz-inline-box-children cqz-result-h3'>
  <div class='cliqz-result-mid-box' style="width:{{ width }}px; margin-right: 32px">
    <div style='margin-bottom:7px;'>
      <span class="cliqz-cluster-title-box overflow"
	        style="cursor: pointer">
        {{ data.summary}}
      </span>
      {{#each data.control}}
        <span class="cliqz-cluster-result-control"
              url='{{url}}'
              type='{{../type}}'
              extra='control{{ @index }}'
              style="cursor: pointer">
          {{ title }}
        </span>
      {{/each}}
      <br style="clear:both"/>
    </div>
    {{#each data.topics}}
      <div class='overflow cliqz-cluster-result-topic'>
        <span class="cliqz-cluster-topic-label"
              url='{{labelUrl}}'
              type='{{../type}}'
              extra='topic-label{{ @index }}'
              style="background-color:{{color}};">
              {{label}}
        </span>
        {{#each urls}}
          <span
              style="color: {{../color}}; cursor: pointer"
              url='{{url}}'
              type='{{../../type}}'
              extra='topic{{ @index }}'
              class="cliqz-cluster-topic"
              kind='{{ kind_printer kind }}'
              >
                {{ title }}
          </span>
        {{/each}}
      </div>
    {{/each}}
  </div>
  <div class='cliqz-result-right-box cliqz-logo {{ logo }}' newtab='true'>
  </div>
</div>
