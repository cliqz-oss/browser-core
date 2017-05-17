<div class='cliqz-celeb cqz-result-h2'>
	{{#with data}}
		<div class='cqz-celeb-images'>
       {{#each deepResults}}
			 		{{#if (logic type '===' 'images')}}
						{{#each links}}
							<a href="{{extra.original_image}}" extra="image-{{ @index }}">
          			<img src='{{image}}' class='cqz-celeb-image' />
							</a>
						{{/each}}
					{{/if}}
       {{/each}}
	    </div>
	    <div class='cqz-result-title cqz-ez-title cqz-celeb-who' arrow="false" arrow-override='' extra="title">
	    	<a href="{{../url}}" extra="title">{{title}}</a><span> (Wikipedia) </span>
	    </div>
	    <span class="cqz-ez-subtitle">
	      {{ emphasis ../urlDetails.friendly_url text 2 true }}
	    </span>

	    <div class='cqz-celeb-desc'>
	        <span extra="des">{{ emphasis description ../text 2 true }}</span>
	    </div>
		<div class='cqz-celeb-social-box'>
			{{#each deepResults}}
				{{#if (logic type '===' 'social')}}
					{{#each links}}
					  <img
					  	src='{{image}}'
					  	url='{{url}}'
					    show-status='true'
					  	class='cqz-celeb-social'
					    extra='social-{{ @index }}' />
					{{/each}}
				{{/if}}
			{{/each}}
    </div>
    {{/with}}
</div>
{{>logo}}
