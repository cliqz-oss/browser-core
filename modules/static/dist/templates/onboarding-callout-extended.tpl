<div class='onboarding-callout'>
	<div class="msg-container">
		{{ message }}
	</div>
	
	<div class="btn-container-extended">
		{{#each options}}
			<span class="cqz-btn cqz-btn-{{ state }}" cliqz-action="{{ action }}">{{ label }}</span>	
		{{/each}}
		<img class="cliqz-logo" src="{{cliqz_logo}}" />
	</div>
</div>