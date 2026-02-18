import asyncAuto from 'async/auto.js';
import { cancelHodlInvoice } from 'ln-service';
import { returnResult } from 'asyncjs-util';
import createConnectivityTrigger from './create_connectivity_trigger.js';
import createFollowNodeTrigger from './create_follow_node_trigger.js';
import getTriggers from './get_triggers.js';
import subscribeToTriggers from './subscribe_to_triggers.js';

const actionAddConnectivityTrigger = 'action-add-connectivity-trigger';
const actionAddFollowTrigger = 'action-add-follow-trigger';
const actionDeleteTrigger = 'action-delete-trigger';
const actionListTriggers = 'action-list-triggers';
const actionSubscribeToTriggers = 'action-subscribe-to-triggers';
const isPublicKey = n => !!n && /^0[2-3][0-9A-F]{64}$/i.test(n);

/** Manage trigger actions

  {
    ask: <Ask Function>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
*/
export default ({ask, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!ask) {
          return cbk([400, 'ExpectedAskFunctionToManageTriggers']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedAuthenticatedLndToManageTriggers']);
        }

        return cbk();
      },

      // Select trigger action
      selectAction: ['validate', ({}, cbk) => {
        return ask({
          choices: [
            {
              name: 'Add Node Connectivity Trigger',
              value: actionAddConnectivityTrigger,
            },
            {
              name: 'Add Follow Node Trigger',
              value: actionAddFollowTrigger,
            },
            {
              name: 'View Triggers',
              value: actionListTriggers,
            },
            {
              name: 'Subscribe to Triggers',
              value: actionSubscribeToTriggers,
            },
          ],
          message: 'Trigger action?',
          name: 'action',
          type: 'select',
        },
        ({action}) => cbk(null, action));
      }],

      // Ask for details about a new connectivity trigger
      askForConnectivityTrigger: ['selectAction', ({selectAction}, cbk) => {
        // Exit early when not adding a trigger
        if (selectAction !== actionAddConnectivityTrigger) {
          return cbk();
        }

        return ask({
          message: 'Node public key to watch connectivity with?',
          name: 'id',
          type: 'input',
          validate: input => {
            if (!input) {
              return false;
            }

            if (!isPublicKey(input)) {
              return 'Enter a node identity public key';
            }

            return true;
          },
        },
        ({id}) => cbk(null, id));
      }],

      // Ask for details about a new follow trigger
      askForFollowTrigger: ['selectAction', ({selectAction}, cbk) => {
        // Exit early when not adding a trigger
        if (selectAction !== actionAddFollowTrigger) {
          return cbk();
        }

        return ask({
          message: 'Node public key to follow?',
          name: 'id',
          type: 'input',
          validate: input => {
            if (!input) {
              return false;
            }

            if (!isPublicKey(input)) {
              return 'Enter a node identity public key to follow';
            }

            return true;
          },
        },
        ({id}) => cbk(null, id));
      }],

      // Get the list of triggers
      getTriggers: ['selectAction', ({selectAction}, cbk) => {
        // Exit early when not listing triggers
        if (selectAction !== actionListTriggers) {
          return cbk();
        }

        console.info({finding_triggers: true});

        return getTriggers({lnd}, cbk);
      }],

      // Subscribe to triggers
      subscribeToTriggers: ['selectAction', ({selectAction}, cbk) => {
        // Exit early when not subscribing
        if (selectAction !== actionSubscribeToTriggers) {
          return cbk();
        }

        const sub = subscribeToTriggers({lnds: [lnd]});

        sub.on('channel_opened', opened => console.info({opened}));
        sub.on('peer_connected', connected => console.info({connected}));
        sub.on('peer_disconnected', disconnect => console.info({disconnect}));
        sub.on('error', err => cbk(err));

        console.info({listening_for_trigger_events: true});
      }],

      // Create a new connectivity trigger
      createConnectivityTrigger: [
        'askForConnectivityTrigger',
        ({askForConnectivityTrigger}, cbk) =>
      {
        if (!askForConnectivityTrigger) {
          return cbk();
        }

        return createConnectivityTrigger({
          lnd,
          id: askForConnectivityTrigger,
        },
        cbk);
      }],

      // Create a new follow trigger
      createFollowTrigger: [
        'askForFollowTrigger',
        ({askForFollowTrigger}, cbk) =>
      {
        if (!askForFollowTrigger) {
          return cbk();
        }

        return createFollowNodeTrigger({lnd, id: askForFollowTrigger}, cbk);
      }],

      // Select a trigger from the list
      selectTrigger: ['getTriggers', ({getTriggers}, cbk) => {
        if (!getTriggers) {
          return cbk();
        }

        if (!getTriggers.length) {
          return cbk([404, 'NoTriggersFound']);
        }

        return ask({
          choices: getTriggers.map(({connectivity, follow, id}) => {
            if (connectivity) {
              return {
                name: `Connectivity with ${connectivity.id}`,
                value: id,
              };
            } else {
              return {
                name: `Following ${follow.id}`,
                value: id,
              };
            }
          }),
          message: 'Triggers:',
          name: 'view',
          type: 'select',
        },
        ({view}) => cbk(null, view));
      }],

      // Trigger actions
      triggerAction: ['selectTrigger', ({selectTrigger}, cbk) => {
        // Exit early when no trigger is selected to take actions against
        if (!selectTrigger) {
          return cbk();
        }

        return ask({
          choices: [{name: 'Delete Trigger', value: actionDeleteTrigger}],
          message: 'Action?',
          name: 'modify',
          type: 'select',
        },
        ({modify}) => cbk(null, selectTrigger));
      }],

      // Delete a trigger
      deleteTrigger: ['triggerAction', ({triggerAction}, cbk) => {
        // Exit early when not deleting a triger
        if (!triggerAction) {
          return cbk();
        }

        return cancelHodlInvoice({lnd, id: triggerAction}, cbk);
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
