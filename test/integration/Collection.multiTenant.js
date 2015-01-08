var Waterline = require('../../lib/waterline'),
  assert = require('assert');
  var _ = require('lodash');

describe('Waterline Collection', function() {
  var Collection, status = 0;

  var db = {
      'tenant-1': {
          'tests': [{'message':'it worked1!'}]
      },
      'tenant-2': {
          'tests': [{'message':'it worked1!'}]
      }
  }

  before(function(done) {

    var adapter_1 = (function() {
        var connections = {};

        var adapter = {
          identity: 'foo',
          registerConnection: function(connection, collections, cb) {
            // console.log('registerConnection1', connection, connections);

            // Validate arguments
            if(!connection.identity) return cb(new Error("Missing identity"));
            if(connections[connection.identity]) return cb(new Error("Duplicate Identity "+connection.identity));

            // Always ensure the schema key is set to something. This should be remapped in the
            // .describe() method later on.
            Object.keys(collections).forEach(function(coll) {
                collections[coll].schema = collections[coll].definition;
            });

            // Store the connection
            connections[connection.identity] = {
                config: connection,
                collections: collections,
                connection: {}
            };

            status++;
            cb();
          },
          find: function(connectionName, collectionName, options, cb) {
            //   console.log('Find1', connectionName, collectionName, options, this);
            //   console.log(connections);
              var connectionObject = connections[connectionName];
              var collection = connectionObject.collections[collectionName];
              var config = connectionObject.config;
            //   console.log('find1 connection', connectionObject);
            //   console.log('find1 config', config);
            //   console.log('find1 collection', collection);
            //   console.log('find1 collection.tableName', collection.tableName);
              var records = db[config.database][collection.tableName];
            //   console.log('find1 records', records);
              return cb(null, records);
          }
      };
      return adapter;
    })();

    var adapter_2 = {
      identity: 'bar',
      registerConnection: function(connection, collections, cb) {
        //   console.log('registerConnection2', connection, collections);
          status++;
          cb();
      },
      find: function(connectionName, collectionName, options, cb) {
        //   console.log('Find2', connectionName, collectionName, options, this);
          var connectionObject = connections[connectionName];
          var collection = connectionObject.collections[collectionName];
        //   console.log('find2 connection', connection);
          return cb(null, [options]);
      }
    };

    var Model = Waterline.Collection.extend({
      attributes: {
          message: 'string'
      },
      connection: ['my_foo'],
      tableName: 'tests'
    });

    var waterline = new Waterline();
    waterline.loadCollection(Model);

    var connections = {
      'my_foo': {
        adapter: 'foo',
        host: 'localhost',
        port: 12345,
        database: 'default_database',
        isMultiTenant: true,
        defaultTenant: false, // false, <string>, or <number>
        getTenant: function(req, cb) {
          return cb(req.params.tenant);
        },
        configForTenant: function(tenantId, config, cb) {
        //   console.log('getTenantConfig', tenantId, config);
          // Validate Tenant
          tenantId = parseInt(tenantId);
          if (tenantId >= 1 && tenantId < 10) {
            config.database = "tenant-" + tenantId;
            return cb(null, config);
          } else {
            return cb(new Error("Invalid tenant " + tenantId + "!"));
          }
        }
      }
      ,'my_bar': {
        adapter: 'bar',
        database: 'default_database',
        isMultiTenant: false // Optional: default is falsy
      }
    };

    waterline.initialize({
      adapters: {
        'foo': adapter_1,
        'bar': adapter_2
      },
      connections: connections
    }, function(err, colls) {
      if (err) return done(err);
      Collection = colls.collections.tests;
      done();
    });

  });

  describe('with Multitenancy', function() {

    it('should have setup correctly', function() {
      assert(status == 2);
    });

    // it('should error complaining no specified tenant', function(done) {
    //
    //   Collection
    //   .find({})
    //   .exec(function(err, result) {
    //     //   console.log('find result', err.details, result);
    //       assert(err instanceof Error);
    //     //   assert(err.toString(), 'Tenant is required to be specified in operation.', 'tenant is missing as expected');
    //       done();
    //   });
    //
    // });

    it('should find records for specified tenant-1', function(done) {

      Collection
        .tenant("1", function(err, TenantCollection) {
          // Now you have a Tenant-specific Collection!
          TenantCollection
            .find({})
            .exec(function(err, results) {
              assert(results.length === 1, 'tenant-1 has 1 record');
              assert(results[0].message === db['tenant-1']['tests'][0].message, 'records are from the tenant-1 database');
              done();
            });
        });

    });

    it('should find records for specified tenant-2', function(done) {

        Collection
        .tenant("2", function(err, TenantCollection) {
            // Now you have a Tenant-specific Collection!
            TenantCollection
            .find({})
            .exec(function(err, results) {
                assert(results.length === 1, 'tenant-2 has 1 record');
                assert(results[0].message === db['tenant-2']['tests'][0].message, 'records are from the tenant-2 database');
                done();
            });
        });

    });

    // it('should create a record for specified tenant-1', function(done) {
    //     var tenant = "1";
    //     Collection
    //     .tenant(tenant, function(err, TenantCollection) {
    //         // Now you have a Tenant-specific Collection!
    //         TenantCollection
    //         .create({})
    //         .exec(function(err, results) {
    //             assert(results.length === 1, 'tenant-'+tenant+' has 1 record');
    //             assert(results[0].message === db['tenant-'+tenant]['tests'][0].message, 'records are from the tenant-2 database');
    //             done();
    //         });
    //     });
    //
    // });

    // it('should find records for specified tenant', function(done) {
    //
    //   Collection
    //     .tenant("1")
    //     .find({})
    //     .exec(function(err, result) {
    //       console.log(err, result);
    //       done();
    //     });
    // });

  });
});
