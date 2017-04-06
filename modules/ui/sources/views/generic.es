import localData from 'ui/views/local-data-sc';
import utils from 'core/utils';

/**
* @namespace ui.views
* @class Generic
*/
export default class GenericView extends localData {
  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {

    utils.log(data, "!!generic data")

    if(data.subType && data.subType.class == "EntityLocal") {
        super.enhanceResults(data);
    }

    var partialSizeCounter = 0,
        partialsPath = [];

    // Space Count: 1 means that it takes one line
    var partialsBank = {
      'title': {
        'space-count': 1,
        'path': 'partials/ez-title',
      },
      'url': {
        'space-count': 1,
        'path': 'partials/ez-url'
      },
      'history': {
        'space-count': 3,
        'path': 'partials/ez-history'
      },
      'description': {
        'space-count': 0.5,
        'path': 'partials/ez-description'
      },
      'description-m': {
        'space-count': 1,
        'path': 'partials/ez-description'
      },
      'description-l': {
        'space-count': 2,
        'path': 'partials/ez-description'
      },
      'buttons': {
        'space-count': 1,
        'path': 'partials/ez-generic-buttons'
      },
      'local-data-sc': {
        'space-count': 2,
        'path': 'partials/location/local-data'
      },
      'missing_location_1': {
        'space-count': 2,
        'path': 'partials/location/missing_location_1'
      },
      'bottom-data-sc': {
        'space-count': 3,
        'path': 'partials/bottom-data-sc'
      }
    }

    // If we have more than 5 history results we extent the result to full height.
    if (data.urls && data.urls.length > 5) {
      partialsBank['history']['space-count'] = 6;
    }

	// Remove the history if there is local result
    if(data.partials.indexOf('local-data-sc') != -1 || data.partials.indexOf('missing_location_1') != -1) {
      var historyIndex = data.partials.indexOf('history');
      if (historyIndex != -1) {
        data.partials.splice(historyIndex, 1);
      }
    }

	// Remove buttons at the bottom if we're asking for permission
    if(data.partials.indexOf('missing_location_1') != -1) {
        var btnsIndex = data.partials.indexOf('buttons');
        if (btnsIndex != -1) {
          data.partials.splice(btnsIndex, 1);
        }
	}

    for (var ii = 0; ii < data.partials.length; ii++) {
      var prName = data.partials[ii];

      if (partialsBank[prName]) {
        partialSizeCounter += partialsBank[prName]['space-count'];
        partialsPath.push(partialsBank[prName].path);
      }
    }
    var partialDescr; // 'description' if description should be on single line, otherwise 'description-m'
    // Calculate the EZ size. If it is size 3 = 1 line result; If it is between 3 & 6 size = 2 line result; Over 6 = 3 line result;
    if (partialSizeCounter <= 3) {
      data.genericZone = {
        'size': 1,
        'class': 'cqz-result-h3'
      };
      partialDescr = 'description';
    } else if (partialSizeCounter > 3 && partialSizeCounter <= 6) {
      data.genericZone = {
        'size': 2,
        'class': 'cqz-result-h2'
      };
      partialDescr = 'description-m';
    } else {
      data.genericZone = {
        'size': 3,
        'class': 'cqz-result-h1',
      };
      partialDescr = 'description-m';
    }

    //Use 1-line description if there is local result
    if(data.partials.indexOf('local-data-sc') != -1) {
      partialDescr = 'description';

      partialsPath.shift();
      partialsPath.shift();

      data.genericZone.class += ' cqz-local-data-holder';
    }

    data.genericZone.partials = partialsPath;

    //Push the description classes
    if (partialDescr) {
      if (partialsBank[partialDescr]['space-count'] == 0.5) {
        data.genericZone.partials.descriptionSizeClass = "cqz-ellipsis"
      } else {
        data.genericZone.partials.descriptionSizeClass = "cqz-multy-lines-ellipses"
        data.genericZone.partials.descriptionSizeClass += " ";

        // will display 2 lines of descr
        if (partialsBank[partialDescr]['space-count'] == 1) {
          data.genericZone.partials.descriptionSizeClass += "cqz-line-vis-2";
        }
        // will display 3 lines of descr
        if (partialsBank[partialDescr]['space-count'] == 2) {
          data.genericZone.partials.descriptionSizeClass += "cqz-line-vis-3";
        }
      }

    }

    // Format Generic Buttons
    // Max 4 buttons per result otherwise they are hidden and the select arrow goes out of screen.
    if(data.btns && data.btns.length > 4) {
      data.btns = data.btns.slice(0, 4);
    }

    (data.deepResults || []).forEach(function (item) {
      item.links.forEach(function (link) {
        link.urlDetails = utils.getDetailsFromUrl(link.url);
        link.logo = utils.getLogoDetails(link.urlDetails);
      });
    });

  }
}
