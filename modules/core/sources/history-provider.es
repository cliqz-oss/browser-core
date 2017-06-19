Cu.import('resource://gre/modules/PlacesUtils.jsm');

export default {
  connection: null,

  query: function query(sql, columns = []) {
    if (!this.connection) {
      this.connection = PlacesUtils.history
        .QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
    }

    const statement = this.connection.createAsyncStatement(sql),
      results = [];
    let resolver, rejecter, promise;

    promise = new Promise(function (resolve, reject) {
      resolver = resolve;
      rejecter = reject;
    });

    statement.executeAsync({
      handleCompletion(reason) {
        resolver(results);
      },

      handleError: rejecter,

      handleResult(resultSet) {
        let row;
        while (row = resultSet.getNextRow()) {
          const result = columns.reduce( (result, column) => {
            result[column] = row.getResultByName(column);
            return result;
          }, Object.create(null));
          results.push(result);
        }
      }
    });

    return promise;
  }
};
