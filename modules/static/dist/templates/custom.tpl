<div class='cqz-result-h3' url='{{originalUrl}}' arrow='true'>
    <div class='cqz-result-center'>
        <div class='cqz-custom-text overflow'>
        	{{#with data}}
				{{nameify (local 'search')}} <b><i>{{extra.q}}</i></b> {{local 'on'}} {{extra.engine}}
        	{{/with}}
		</div>
    </div>
    {{> logo}}
</div>
