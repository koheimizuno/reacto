import React from 'react';
import { connect } from 'react-redux';
import { Badge, Icon, List, Popover } from 'antd';

class TaskRunnerRenderer extends React.Component {
  state = {
    isOpened: false,
    isBusy: false,
    installOptions: [],
  };

  toggleIsBusy = (cb = () => {}) => this.setState({ isBusy: !this.state.isBusy }, cb);

  renderTask = (task) => {
    const onClick = this.props.taskRunner.stop.bind(this, task.scriptName);

    return (
      <List.Item actions={[<Icon type="pause-circle-o" onClick={onClick} />]}>
        <strong>{task.scriptName}</strong>
      </List.Item>
    );
  }

  renderPopover() {
    const runningTasks = this.props.runningTasks;
    const availableTasks = this.props.availableTasks;

    return (
      <React.Fragment>
        <List
          size="small"
          bordered={false}
          dataSource={runningTasks}
          renderItem={this.renderTask}
          style={{ maxHeight: 300, overflowY: 'auto', marginTop: 10 }}
        />

        <List
          size="small"
          bordered={false}
          dataSource={availableTasks}
          renderItem={([scriptName, command]) => (
            <List.Item>
              <div onClick={this.props.taskRunner.run.bind(this, scriptName, command)}>
                <div><strong>{scriptName}</strong></div>
                <div className="truncate pointer"><small>{command}</small></div>
              </div>
            </List.Item>
          )}
          style={{ maxHeight: 300, overflowY: 'auto', marginTop: 10 }}
        />
      </React.Fragment>
    );
  }

  render() {
    return (
      <Popover
        placement="bottom"
        content={this.renderPopover()}
        trigger="click"
        onVisibleChange={(isOpened) => this.setState({ isOpened })}
        overlayStyle={{ width: 250 }}
      >
        <div>
          <Badge
            status={this.props.runningTasks.length ? "success" : "default"}
            text="Task Runner"
          />
        </div>
      </Popover>
    );
  }
}

const mapStateToProps = (state) => ({
  availableTasks: state.project.taskRunner.availableTasks(),
  runningTasks: state.project.taskRunner.runningTasks,
  taskRunner: state.project.taskRunner,
});

export default connect(mapStateToProps)(TaskRunnerRenderer);
