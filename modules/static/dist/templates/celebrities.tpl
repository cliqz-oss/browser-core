<div class='cliqz-celeb cqz-result-h2'>
	{{#with data}}
	<div class='cqz-celeb-images'>
         {{#each images}}
            <img src='{{this}}' class='cqz-celeb-image' url="{{ get_array_element ../images_meta @index 'ref_url'}}" extra="image-{{ @index }}" />
         {{/each}}
    </div>
    <div class='cqz-result-title cqz-ez-title cqz-celeb-who' arrow="false" arrow-override='' extra="title">
    	<a href="{{../url}}" extra="title">{{ emphasis name ../text 2 true }} ({{ocupation}})</a><span> - Wikipedia</span>
    </div>
    <span class="cqz-ez-subtitle">
      {{ emphasis ../urlDetails.friendly_url text 2 true }}
    </span>

    <div class='cqz-celeb-desc'>
        <span extra="des">{{ emphasis description_wiki ../text 2 true }}</span>
    </div>
	<div class='cqz-celeb-social-box'>
         {{#each social}}
            <img
            	src='{{img}}'
            	url='{{url}}'
                show-status='true'
            	class='cqz-celeb-social'
                extra='social-{{ @index }}' />
         {{/each}}
    </div>
    {{/with}}
</div>
{{>logo}}

