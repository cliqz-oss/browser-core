import React from 'react';
import { StyleSheet, View, Text, Button, ListView } from 'react-native';
import TopBar from './top-bar';
import HistoryItem from './history-item';

export default class extends React.Component {

  constructor(props) {
    super(props);
    this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
  }

  render() {
    const history = this.props.screenProps.store.history.domains;
    const historyList = Object.keys(history).map(key => {
      return {
        baseUrl: history[key].baseUrl,
        domain: key,
        data: history[key]
      };
    }).sort((a, b) => b.data.lastVisitedAt - a.data.lastVisitedAt);

    const navigation = this.props.navigation;
    const actions = this.props.screenProps.actions;
    return <View style={styles.container}>
      <TopBar queryCliqz={actions.queryCliqz} navigation={navigation} navigateTo="Dashboard"
              preNavigate={actions.getOpenTabs()}/>

      {historyList.length == 0 && (
          <Text style={styles.emptyText}>Your History appears here.</Text>
      )}
      {historyList.length != 0 && (
        <ListView
        //style={{}}
        dataSource={this.ds.cloneWithRows(historyList)}
        renderRow={(rowData) => <HistoryItem
          onPress={() => { navigation.navigate("Domainboard", rowData) }}
          navigation={navigation} data={rowData} actions={actions} />}
        />
      )}

      {historyList.length != 0 && (
        <Button
        color='#00A5EE'
        onPress={() => actions.loadMore()}
        title="Load More"/>
      )}

    </View>;
  }
}

var styles = StyleSheet.create({
    container: {
      backgroundColor: '#FFFFFF',
      height: '100%'
    },
    emptyText: {
      color: '#909090',
      textAlign: 'center',
      fontSize: 14,
      marginTop: 250,
      paddingLeft: 8,
      paddingRight: 8
    },
  });
