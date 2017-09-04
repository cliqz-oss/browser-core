import React from 'react';
import { Button, StyleSheet, View, Text, ListView } from 'react-native';

import TopBar from './top-bar';
import LinkCarousel from './link-carousel';
import Icon from './icon';
import Card from './card';

export default class Board extends React.Component {

  constructor(props) {
    super(props);
    this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    const reminderDs = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    const recomendationsDs = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = {
      reminderDs: reminderDs.cloneWithRows([]),
      recomendationsDs: recomendationsDs.cloneWithRows(this.recommendations),
    };
  }

  componentWillMount() {
    const nav = this.props.navigation;
    const domain = nav.state.routeName === "Domainboard" ? nav.state.params.domain : "All";
    const actions = this.props.screenProps.actions;
    actions.getReminders(domain).then((result) => {
      this.state = {
        reminderDs: this.state.reminderDs.cloneWithRows(result),
        recomendationsDs: this.state.recomendationsDs,
      };
    });
  }

  render() {
    const navigation = this.props.navigation;
    const { navigate, state } = navigation;
    const actions = this.props.screenProps.actions;

    return <View style={{flex: 1, backgroundColor:'#FFFFFF'}}>
      <TopBar queryCliqz={actions.queryCliqz} navigation={navigation} navigateTo="Home" />
      {this.baseUrl && (
        <View>
            <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEEEEE', height: 54}}>
              <Icon width={25} height={25} borderRadius={4} url={this.baseUrl}/>
              <Text style={{marginTop: 1}}>{this.baseUrl}</Text>
            </View>

            {this.snippet && (
              <Text style={styles.text}>{this.snippet}</Text>
            )}
            {this.links && (
              <View style={styles.links}>
                {this.links.map(link => <Button style={styles.link}
                  title={link.title}
                  color='#00A5EE'
                  onPress={() => actions.openUrl(navigation, link.url)} />)}
              </View>
            )}
        </View>
      )}

      {this.state.reminderDs.getRowCount() > 0 && <LinkCarousel
        title={"Upcoming Reminders"}
        dataSource={this.state.reminderDs}
        onClick={(item) => actions.openUrl(navigation, item.url)}
      />}

      {this.recommendations != false && <LinkCarousel
        title={"Recommendations"}
        dataSource={this.state.recomendationsDs}
        onClick={(item) => actions.openUrl(navigation, item.url)}
      />}

      {(this.history.length == 0 && this.props.navigation.state.routeName === "Dashboard") && (
          <Text style={styles.emptyText}>This is your Dashboard.</Text>
      )}

      {this.history.length != 0 && (
        <ListView
        dataSource={this.ds.cloneWithRows(this.history)}
        renderRow={(rowData) => <Card result={rowData}
                    onPress = {() => {
                      console.log('tab id', rowData.id);
                      if (rowData.id) {
                        actions.openTab(rowData.id);
                      } else {
                        actions.openUrl(navigation, rowData.url);
                      }
                    }}
                />}
        />
      )}
    </View>;
  }
}

var styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  link: {
    alignSelf: 'flex-start',
  },
  text: {
    marginTop: 5,
    padding: 5,
    color: '#000',
    textAlign: 'center',
    fontSize: 12
  },
  emptyText: {
    color: '#909090',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 120,
    paddingLeft: 8,
    paddingRight: 8
  },
});
